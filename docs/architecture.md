# CloudCode — System Architecture & Cloud Design

## 1. Executive Architecture Overview

CloudCode is a production-oriented collaborative cloud IDE built to demonstrate key Cloud Computing paradigms:
- **Centralized Cloud-Ready Storage**: Projects, documents, and assets reside on durable backend storage rather than user devices.
- **Real-Time Collaboration**: Multi-user concurrent editing powered by operational synchronization, WebSockets, and room awareness.
- **Stateless Backend Design**: The FastAPI API layer maintains minimal in-memory state; coordination is delegated to Redis/database allowing seamless horizontal scaling.
- **Asynchronous Task & Sandbox Execution**: Heavy compilation and execution jobs run in isolated worker sandboxes with strict CPU, memory, and timeout bounds.
- **Resilience and Fault-Tolerance**: Automatic reconnection, non-destructive version checkpointing, and debounced database transactions.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Browser IDE)"]
        BrowserA["Client A (Monaco Editor + WebSocket)"]
        BrowserB["Client B (Monaco Editor + WebSocket)"]
    end

    subgraph GatewayLayer ["Gateway & Reverse Proxy"]
        Nginx["Nginx Reverse Proxy / Load Balancer (Port 80/3000)"]
    end

    subgraph ServiceLayer ["Cloud Application Services"]
        API["FastAPI API Server (Port 8000)"]
        CollabEngine["Real-time Collaboration Broker (WebSockets)"]
    end

    subgraph DataLayer ["Cloud Persistence & Ephemeral State"]
        Postgres[(PostgreSQL 16 / SQLite Database)]
        Redis[(Redis 7 Coordination & Cache)]
    end

    subgraph SandboxLayer ["Isolated Execution Sandbox"]
        WorkerPool["Isolated Execution Worker Pool"]
        PyRunner["Python 3.11 Sandbox (128MB / 15s limit)"]
        NodeRunner["Node.js 20 Sandbox (128MB / 15s limit)"]
        CRunner["GCC / C++ Sandbox (Non-root user)"]
        IframePreview["Restricted Iframe Sandbox (Web Preview)"]
    end

    BrowserA <-->|HTTP / REST| Nginx
    BrowserA <-->|WSS (Cursors & Sync)| Nginx
    BrowserB <-->|HTTP / REST| Nginx
    BrowserB <-->|WSS (Cursors & Sync)| Nginx

    Nginx -->|/api/*| API
    Nginx -->|/ws/*| CollabEngine

    API <--> Postgres
    API <--> Redis
    CollabEngine <--> Postgres
    CollabEngine <--> Redis

    API -->|Queue Job| WorkerPool
    WorkerPool --> PyRunner
    WorkerPool --> NodeRunner
    WorkerPool --> CRunner
    BrowserA -.->|Client-side isolated render| IframePreview
```

---

## 3. Data Flow Workflows

### A. Real-Time Collaboration Flow
1. **Handshake**: Client connects to `/ws/collaborate/{projectId}/{fileId}?token=...`.
2. **Auth Verification**: Token is decoded, project membership and read/write permissions are confirmed.
3. **Room Subscription**: The client is registered with a unique color badge and presence info; initial document state and active peer list are sent to the client.
4. **Live Synchronization**: When Client A types or moves cursor:
   - Client A broadcasts delta changes and cursor position to the room.
   - The collaboration manager sends delta updates to all other active connected peers.
   - Peer Monaco editors render remote cursors and update document models in real time.
5. **Durable Persistence**: Document changes are debounced and saved into the database, preserving all edits against server reboots or tab refreshes.

### B. Secure Code Execution Flow
1. **Trigger**: User hits **Run** (or `Ctrl+Enter`).
2. **Job Registration**: Backend creates an `ExecutionJob` in database (`QUEUED` -> `RUNNING`).
3. **Sandbox Preparation**: A disposable, temporary sandbox workspace is created with non-root ownership.
4. **Execution & Limits**:
   - Timeouts enforce a strict 15-second cutoff (`asyncio.wait_for`).
   - Memory is capped at 128MB.
   - Standard input (stdin) is piped through stdin stream.
   - Stdout and Stderr are truncated at 64KB to prevent memory exhaustion attacks.
5. **Cleanup & Response**: Temporary sandbox directories are securely wiped (`shutil.rmtree`), and final execution metrics (stdout, stderr, exit code, elapsed duration) are persisted to the database and returned to the client terminal.
