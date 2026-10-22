# CloudCode — REST API & WebSocket Documentation

All REST API endpoints are served under `/api/v1`. Interactive Swagger documentation is accessible at `/docs` and ReDoc at `/redoc`.

---

## 1. Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new developer account (First user = Admin) | No |
| `POST` | `/api/v1/auth/login` | Authenticate with username/email and password | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | Bearer Token |
| `PATCH` | `/api/v1/auth/me` | Update name, avatar, or password | Bearer Token |
| `POST` | `/api/v1/auth/logout` | Revoke session / sign out | Bearer Token |

---

## 2. Project Management Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/projects` | List projects (with filtering by owned/shared/archived) | Bearer Token |
| `POST` | `/api/v1/projects` | Create workspace with starter template | Bearer Token |
| `GET` | `/api/v1/projects/{id}` | Get workspace details, role, and storage usage | Bearer Token |
| `PATCH` | `/api/v1/projects/{id}` | Update project metadata or settings (Owner only) | Bearer Token |
| `DELETE` | `/api/v1/projects/{id}` | Delete project and all associated files (Owner only) | Bearer Token |
| `POST` | `/api/v1/projects/{id}/duplicate` | Clone complete workspace and all files | Bearer Token |

---

## 3. Files & Folders Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/projects/{id}/files` | Retrieve hierarchical file & folder tree | Bearer Token |
| `POST` | `/api/v1/projects/{id}/files` | Create new file with language detection | Bearer Token |
| `POST` | `/api/v1/projects/{id}/folders` | Create new folder | Bearer Token |
| `GET` | `/api/v1/files/{file_id}` | Fetch file content and metadata | Bearer Token |
| `PATCH` | `/api/v1/files/{file_id}` | Update file content (autosave / manual save) | Bearer Token |
| `DELETE` | `/api/v1/files/{file_id}` | Recursively delete file or folder | Bearer Token |
| `POST` | `/api/v1/files/{file_id}/move` | Move file or folder into new parent directory | Bearer Token |

---

## 4. Code Execution Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/projects/{id}/executions` | Queue and execute code in isolated sandbox | Bearer Token |
| `GET` | `/api/v1/projects/{id}/executions` | List execution history runs for project | Bearer Token |
| `GET` | `/api/v1/executions/{id}` | Get detailed run results (stdout, stderr, exit code) | Bearer Token |
| `POST` | `/api/v1/executions/{id}/cancel` | Cancel in-flight execution job | Bearer Token |

---

## 5. Sharing & Collaboration Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/projects/{id}/invitations` | Invite collaborator by registered email | Bearer Token |
| `GET` | `/api/v1/projects/{id}/members` | List project collaborators and assigned roles | Bearer Token |
| `PATCH` | `/api/v1/projects/{id}/members/{m_id}` | Update collaborator role (editor/runner/viewer) | Bearer Token |
| `DELETE` | `/api/v1/projects/{id}/members/{m_id}` | Revoke member access from project | Bearer Token |
| `POST` | `/api/v1/invitations/{token}/accept` | Accept project invitation via token | Bearer Token |
| `POST` | `/api/v1/invitations/{token}/decline` | Decline invitation | Bearer Token |
| `GET` | `/api/v1/invitations/pending` | List user's pending invitations | Bearer Token |

---

## 6. Version History & Checkpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/files/{id}/versions` | List snapshot versions for a file | Bearer Token |
| `POST` | `/api/v1/files/{id}/versions` | Create manual checkpoint snapshot | Bearer Token |
| `POST` | `/api/v1/files/{id}/versions/{v_id}/restore` | Restore file content to specified checkpoint | Bearer Token |

---

## 7. WebSockets Protocol

### Endpoint: `/ws/collaborate/{project_id}/{file_id}?token={JWT}`

- **Connection**:
  1. Handshake verifies JWT token and checks project permissions.
  2. Server responds with `room_state` containing current connected peers and version.
- **Client Messages**:
  - Cursor Update: `{"type": "cursor", "line": 10, "ch": 4, "selection": {...}}`
  - Document Change: `{"type": "doc_change", "content": "...", "version": 2}`
  - Heartbeat: `{"type": "ping"}`
- **Server Messages**:
  - `{"type": "user_joined", "user": {...}, "collaborators": [...]}`
  - `{"type": "user_left", "userId": "...", "collaborators": [...]}`
  - `{"type": "cursor_update", "userId": "...", "color": "#3b82f6", "cursor": {...}}`
  - `{"type": "doc_change", "content": "...", "version": 3, "authorId": "..."}`
  - `{"type": "pong"}`
