from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.core.security import decode_access_token
from app.models.models import User, Project, ProjectMember, File, DocumentState, ProjectRole
from app.collaboration.manager import collaboration_manager
import json
import logging

logger = logging.getLogger("cloudcode.ws")
router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/collaborate/{project_id}/{file_id}")
async def websocket_collaboration_endpoint(
    websocket: WebSocket,
    project_id: str,
    file_id: str,
    token: str = Query(...)
):
    # 1. Authenticate token
    user_id = decode_access_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized: invalid or expired token")
        return

    # 2. Verify permissions and fetch user details
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        if not user or not user.is_active:
            await websocket.close(code=4001, reason="User not active")
            return

        file_obj = await db.get(File, file_id)
        if not file_obj or file_obj.project_id != project_id:
            await websocket.close(code=4004, reason="File not found")
            return

        project = await db.get(Project, project_id)
        if not project:
            await websocket.close(code=4004, reason="Project not found")
            return

        # Check permission
        is_owner = project.owner_id == user.id
        is_admin = user.role == "admin"
        mem_res = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user.id
            )
        )
        membership = mem_res.scalar_one_or_none()
        is_member = membership is not None
        is_public = project.visibility == "public"

        if not (is_owner or is_admin or is_member or is_public):
            await websocket.close(code=4003, reason="Access denied to this project")
            return

        # If room has no cached document content yet, seed from file content
        room = await collaboration_manager.get_or_create_room(file_id, project_id)
        if room.document_content is None:
            room.document_content = file_obj.content
            room.last_saved_content = file_obj.content

    # 3. Connect client into collaboration room
    await collaboration_manager.connect_client(
        websocket=websocket,
        file_id=file_id,
        project_id=project_id,
        user_id=user.id,
        username=user.username,
        full_name=user.full_name
    )

    save_counter = 0

    try:
        while True:
            text_data = await websocket.receive_text()
            try:
                data = json.loads(text_data)
            except Exception:
                continue

            await collaboration_manager.handle_message(websocket, file_id, data)

            # Check if this was a doc change to persist
            if data.get("type") == "doc_change":
                save_counter += 1
                # Periodically save changes to database
                if save_counter >= 5:
                    save_counter = 0
                    new_content = data.get("content")
                    if new_content is not None:
                        try:
                            async with AsyncSessionLocal() as save_db:
                                db_file = await save_db.get(File, file_id)
                                if db_file:
                                    db_file.content = new_content
                                    db_file.size = len(new_content.encode('utf-8'))
                                    await save_db.commit()
                        except Exception as e:
                            logger.error(f"Error persisting collaborative file: {e}")

    except WebSocketDisconnect:
        # Save final state on disconnect if changed
        try:
            room = collaboration_manager.rooms.get(file_id)
            if room and room.document_content and room.document_content != room.last_saved_content:
                async with AsyncSessionLocal() as save_db:
                    db_file = await save_db.get(File, file_id)
                    if db_file:
                        db_file.content = room.document_content
                        db_file.size = len(room.document_content.encode('utf-8'))
                        await save_db.commit()
                        room.last_saved_content = room.document_content
        except Exception as e:
            logger.error(f"Error on disconnect save: {e}")

        await collaboration_manager.disconnect_client(websocket, file_id)
