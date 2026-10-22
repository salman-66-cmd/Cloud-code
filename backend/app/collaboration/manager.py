import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any, List
from fastapi import WebSocket
from datetime import datetime, timezone

logger = logging.getLogger("cloudcode.collaboration")

class CollaboratorInfo:
    def __init__(self, user_id: str, username: str, full_name: Optional[str] = None, avatar_url: Optional[str] = None, color: str = "#3b82f6"):
        self.user_id = user_id
        self.username = username
        self.full_name = full_name
        self.avatar_url = avatar_url
        self.color = color
        self.cursor: Optional[Dict[str, Any]] = None
        self.last_active: str = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "userId": self.user_id,
            "username": self.username,
            "fullName": self.full_name,
            "avatarUrl": self.avatar_url,
            "color": self.color,
            "cursor": self.cursor,
            "lastActive": self.last_active
        }

USER_COLORS = [
    "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b",
    "#06b6d4", "#6366f1", "#14b8a6", "#f43f5e", "#84cc16"
]

class CollaborationRoom:
    def __init__(self, file_id: str, project_id: str):
        self.file_id = file_id
        self.project_id = project_id
        self.active_connections: Dict[WebSocket, CollaboratorInfo] = {}
        self.document_content: Optional[str] = None
        self.version: int = 1
        self.last_saved_content: Optional[str] = None
        self.lock = asyncio.Lock()

    def add_client(self, websocket: WebSocket, info: CollaboratorInfo):
        # Assign color based on user_id hash
        color_idx = abs(hash(info.user_id)) % len(USER_COLORS)
        info.color = USER_COLORS[color_idx]
        self.active_connections[websocket] = info

    def remove_client(self, websocket: WebSocket) -> Optional[CollaboratorInfo]:
        return self.active_connections.pop(websocket, None)

    def get_collaborators(self) -> List[Dict[str, Any]]:
        # Deduplicate by userId
        unique_users: Dict[str, CollaboratorInfo] = {}
        for info in self.active_connections.values():
            unique_users[info.user_id] = info
        return [info.to_dict() for info in unique_users.values()]

    async def broadcast(self, message: Dict[str, Any], exclude: Optional[WebSocket] = None):
        dead_connections = []
        for ws in self.active_connections.keys():
            if ws != exclude:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead_connections.append(ws)
        for dead in dead_connections:
            self.remove_client(dead)

class CollaborationManager:
    def __init__(self):
        # Maps file_id -> CollaborationRoom
        self.rooms: Dict[str, CollaborationRoom] = {}
        # Maps project_id -> Set of active project websockets
        self.project_rooms: Dict[str, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def get_or_create_room(self, file_id: str, project_id: str) -> CollaborationRoom:
        async with self.lock:
            if file_id not in self.rooms:
                self.rooms[file_id] = CollaborationRoom(file_id, project_id)
            return self.rooms[file_id]

    async def connect_client(
        self,
        websocket: WebSocket,
        file_id: str,
        project_id: str,
        user_id: str,
        username: str,
        full_name: Optional[str] = None
    ):
        await websocket.accept()
        room = await self.get_or_create_room(file_id, project_id)
        info = CollaboratorInfo(user_id=user_id, username=username, full_name=full_name)
        room.add_client(websocket, info)

        # Notify others in the room
        await room.broadcast({
            "type": "user_joined",
            "fileId": file_id,
            "user": info.to_dict(),
            "collaborators": room.get_collaborators()
        }, exclude=websocket)

        # Send initial room state to newly joined client
        await websocket.send_text(json.dumps({
            "type": "room_state",
            "fileId": file_id,
            "collaborators": room.get_collaborators(),
            "version": room.version,
            "content": room.document_content
        }))

    async def disconnect_client(self, websocket: WebSocket, file_id: str):
        if file_id in self.rooms:
            room = self.rooms[file_id]
            leaving_user = room.remove_client(websocket)
            if leaving_user:
                await room.broadcast({
                    "type": "user_left",
                    "fileId": file_id,
                    "userId": leaving_user.user_id,
                    "username": leaving_user.username,
                    "collaborators": room.get_collaborators()
                })
            
            # Clean up room if empty
            if len(room.active_connections) == 0:
                async with self.lock:
                    if file_id in self.rooms and len(self.rooms[file_id].active_connections) == 0:
                        del self.rooms[file_id]

    async def handle_message(self, websocket: WebSocket, file_id: str, data: Dict[str, Any]):
        if file_id not in self.rooms:
            return
        room = self.rooms[file_id]
        msg_type = data.get("type")

        if msg_type == "cursor":
            # Update collaborator's cursor
            if websocket in room.active_connections:
                info = room.active_connections[websocket]
                info.cursor = {
                    "line": data.get("line", 1),
                    "ch": data.get("ch", 1),
                    "selection": data.get("selection")
                }
                info.last_active = datetime.now(timezone.utc).isoformat()
                await room.broadcast({
                    "type": "cursor_update",
                    "fileId": file_id,
                    "userId": info.user_id,
                    "username": info.username,
                    "color": info.color,
                    "cursor": info.cursor
                }, exclude=websocket)

        elif msg_type == "doc_change":
            # Live document content synchronization
            new_content = data.get("content")
            changes = data.get("changes")
            version = data.get("version", room.version + 1)
            room.document_content = new_content
            room.version = version

            # Broadcast update to all other collaborators
            await room.broadcast({
                "type": "doc_change",
                "fileId": file_id,
                "content": new_content,
                "changes": changes,
                "version": version,
                "authorId": data.get("authorId")
            }, exclude=websocket)

        elif msg_type == "ping":
            await websocket.send_text(json.dumps({"type": "pong"}))

collaboration_manager = CollaborationManager()
