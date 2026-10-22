# CloudCode — Database Schema & Data Models

## 1. Relational Database Design Overview

CloudCode utilizes PostgreSQL for production and an asynchronous SQLite driver (`aiosqlite`) for frictionless local development. All models are defined using modern SQLAlchemy 2.0 async paradigms with explicit foreign key cascading, unique constraints, and UTC timestamps.

---

## 2. Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "owns"
    USERS ||--o{ PROJECT_MEMBERS : "participates"
    USERS ||--o{ EXECUTION_JOBS : "triggers"
    USERS ||--o{ COMMENTS : "writes"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--|| USER_QUOTAS : "has"

    PROJECTS ||--o{ PROJECT_MEMBERS : "includes"
    PROJECTS ||--o{ FILES : "contains"
    PROJECTS ||--o{ INVITATIONS : "offers"
    PROJECTS ||--o{ EXECUTION_JOBS : "records"
    PROJECTS ||--o{ COMMENTS : "contains"
    PROJECTS ||--o{ ACTIVITY_EVENTS : "tracks"

    FILES ||--o{ FILE_VERSIONS : "versions"
    FILES ||--|| DOCUMENT_STATES : "syncs"
    FILES ||--o{ FILES : "parent_of"

    USERS {
        string id PK
        string email UK
        string username UK
        string full_name
        string hashed_password
        string role "admin | user"
        boolean is_active
        datetime created_at
    }

    PROJECTS {
        string id PK
        string name
        text description
        string owner_id FK
        string language
        string visibility "private | public"
        string status "active | archived"
        int storage_usage
        datetime created_at
        datetime updated_at
    }

    PROJECT_MEMBERS {
        string id PK
        string project_id FK
        string user_id FK
        string role "owner | editor | runner | viewer"
        datetime joined_at
    }

    FILES {
        string id PK
        string project_id FK
        string parent_id FK
        string name
        string path
        boolean is_folder
        text content
        string language
        int size
        datetime created_at
        datetime updated_at
    }

    FILE_VERSIONS {
        string id PK
        string file_id FK
        int version_num
        text content
        string commit_message
        string created_by_id FK
        datetime created_at
    }

    EXECUTION_JOBS {
        string id PK
        string project_id FK
        string file_id FK
        string user_id FK
        string language
        string status "completed | failed | timed_out | cancelled"
        text stdin_content
        text stdout
        text stderr
        int exit_code
        float duration_ms
        datetime created_at
        datetime completed_at
    }
```

---

## 3. Key Model Explanations

1. **`User` & `ProjectMember`**:
   - Implements Role-Based Access Control (RBAC).
   - Global Roles: `admin`, `user`.
   - Project-Level Permissions: `owner` (full administration), `editor` (create/modify files, run code), `runner` (read files and execute), `viewer` (read-only).
2. **`File` & `FileVersion`**:
   - Non-destructive versioning. Restoring a version creates a new incremented revision rather than destroying historical snapshots.
   - Sibling uniqueness is validated by parent directory and project id.
3. **`DocumentState`**:
   - Retains collaborative synchronizations and state vectors for concurrent editing sessions.
4. **`ExecutionJob`**:
   - Retains per-project execution metrics, stdout/stderr, and exit codes capped at 64KB per run.
