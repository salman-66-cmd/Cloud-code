# CloudCode — Real-Time Collaborative Editing & Synchronization

## 1. Collaboration Architecture

CloudCode delivers low-latency real-time multi-user editing with active peer awareness, remote cursor rendering, and durable document synchronization:

1. **State Ownership**:
   - The authoritative master document is persistently stored in PostgreSQL/SQLite (`File.content`).
   - Active collaboration rooms (`CollaborationRoom`) cache the live document state and maintain real-time awareness across connected peers.
2. **Awareness & Presence**:
   - Each collaborator is assigned a consistent color badge derived from their unique user ID hash.
   - Cursor line and column coordinates are emitted as the user edits or moves the cursor in Monaco Editor.
   - Remote cursors are decorated into peer Monaco editor instances using `monaco.editor.deltaDecorations`.
3. **Synchronization & Conflict Handling**:
   - Clients emit delta changes and content updates over authenticated WebSockets.
   - The collaboration broker broadcasts changes immediately to all active peer connections in the room.
   - Document state updates are debounced and persisted transactionally to the database.
4. **Resilience & Reconnection**:
   - If a peer's connection drops due to network blips, the client employs automatic exponential backoff reconnection.
   - On reconnect, the server transmits `room_state` with the latest document version and active peers.
