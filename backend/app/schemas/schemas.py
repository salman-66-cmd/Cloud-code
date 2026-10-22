from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    role: str
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None

# --- Project Schemas ---
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    language: str = "python"
    visibility: str = "private"
    template: Optional[str] = None  # python, javascript, typescript, html, c, cpp

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = None
    status: Optional[str] = None

class ProjectMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    role: str
    joined_at: datetime
    user: Optional[UserOut] = None

class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str
    language: str
    visibility: str
    status: str
    storage_usage: int
    is_template: bool
    created_at: datetime
    updated_at: datetime
    owner: Optional[UserOut] = None
    member_count: Optional[int] = 1
    my_role: Optional[str] = "owner"

# --- File & Folder Schemas ---
class FileCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[str] = None
    content: Optional[str] = ""
    language: Optional[str] = "plaintext"

class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[str] = None

class FileUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    language: Optional[str] = None

class FileMove(BaseModel):
    target_parent_id: Optional[str] = None

class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    parent_id: Optional[str] = None
    name: str
    path: str
    is_folder: bool
    content: Optional[str] = ""
    language: str
    size: int
    created_at: datetime
    updated_at: datetime

class FileTreeItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    path: str
    is_folder: bool
    language: str
    size: int
    parent_id: Optional[str] = None
    children: Optional[List["FileTreeItem"]] = []

# --- Sharing & Invitation Schemas ---
class InvitationCreate(BaseModel):
    invitee_email: EmailStr
    role: str = "editor"

class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    inviter_id: str
    invitee_email: str
    role: str
    token: str
    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None

class MemberUpdate(BaseModel):
    role: str

# --- Versioning Schemas ---
class VersionCreate(BaseModel):
    commit_message: Optional[str] = "Manual snapshot"

class VersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    file_id: str
    version_num: int
    content: str
    commit_message: str
    created_by_id: Optional[str] = None
    created_at: datetime

# --- Execution Schemas ---
class ExecutionCreate(BaseModel):
    file_id: Optional[str] = None
    language: Optional[str] = None
    code: Optional[str] = None
    stdin_content: Optional[str] = ""

class ExecutionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    file_id: Optional[str] = None
    user_id: Optional[str] = None
    language: str
    status: str
    stdin_content: str
    stdout: str
    stderr: str
    exit_code: Optional[int] = None
    duration_ms: float
    created_at: datetime
    completed_at: Optional[datetime] = None

# --- Comment Schemas ---
class CommentCreate(BaseModel):
    file_id: Optional[str] = None
    parent_id: Optional[str] = None
    content: str = Field(..., min_length=1, max_length=2000)

class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    file_id: Optional[str] = None
    user_id: str
    parent_id: Optional[str] = None
    content: str
    created_at: datetime
    updated_at: datetime
    user: Optional[UserOut] = None

# --- Notification Schemas ---
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

# --- Activity Schemas ---
class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    user_id: Optional[str] = None
    action: str
    details: Optional[str] = None
    created_at: datetime

# --- Health Schemas ---
class HealthOut(BaseModel):
    status: str
    version: str
    database: str
    timestamp: datetime
    worker_status: str

# Rebuild models with forward references
FileTreeItem.model_rebuild()
