from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, ForeignKey, DateTime, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class ProjectRole(str, enum.Enum):
    OWNER = "owner"
    EDITOR = "editor"
    RUNNER = "runner"
    VIEWER = "viewer"

class ProjectVisibility(str, enum.Enum):
    PRIVATE = "private"
    PUBLIC = "public"
    SHARED = "shared"

class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"

class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"

class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PREPARING = "preparing"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMED_OUT = "timed_out"
    CANCELLED = "cancelled"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.USER.value, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    owned_projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    executions = relationship("ExecutionJob", back_populates="user")
    comments = relationship("Comment", back_populates="user")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    language = Column(String(50), default="python", nullable=False)  # python, javascript, typescript, html, c, cpp
    visibility = Column(String(50), default=ProjectVisibility.PRIVATE.value, nullable=False)
    status = Column(String(50), default=ProjectStatus.ACTIVE.value, nullable=False)
    storage_usage = Column(Integer, default=0)  # bytes
    is_template = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="owned_projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    files = relationship("File", back_populates="project", cascade="all, delete-orphan")
    executions = relationship("ExecutionJob", back_populates="project", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="project", cascade="all, delete-orphan")
    activities = relationship("ActivityEvent", back_populates="project", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="project", cascade="all, delete-orphan")

class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default=ProjectRole.EDITOR.value, nullable=False)
    joined_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="memberships")

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    inviter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invitee_email = Column(String(255), nullable=False, index=True)
    role = Column(String(50), default=ProjectRole.EDITOR.value, nullable=False)
    token = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(String(50), default=InvitationStatus.PENDING.value, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="invitations")

class File(Base):
    __tablename__ = "files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    path = Column(String(1024), nullable=False)
    is_folder = Column(Boolean, default=False, nullable=False)
    content = Column(Text, default="", nullable=False)
    language = Column(String(50), default="plaintext", nullable=False)
    size = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    project = relationship("Project", back_populates="files")
    versions = relationship("FileVersion", back_populates="file", cascade="all, delete-orphan")
    doc_state = relationship("DocumentState", back_populates="file", uselist=False, cascade="all, delete-orphan")

class FileVersion(Base):
    __tablename__ = "file_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    version_num = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    commit_message = Column(String(255), default="Autosave snapshot", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    file = relationship("File", back_populates="versions")

class DocumentState(Base):
    """Stores persistent Yjs CRDT or synchronized operational state for real-time conflict-free collaboration"""
    __tablename__ = "document_states"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), unique=True, nullable=False)
    state_data = Column(Text, default="", nullable=False)  # Base64 or serialized CRDT state
    version = Column(Integer, default=1, nullable=False)
    last_saved_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    file = relationship("File", back_populates="doc_state")

class ExecutionJob(Base):
    __tablename__ = "execution_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id = Column(String(36), ForeignKey("files.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    language = Column(String(50), nullable=False)
    status = Column(String(50), default=JobStatus.QUEUED.value, nullable=False, index=True)
    stdin_content = Column(Text, default="", nullable=False)
    stdout = Column(Text, default="", nullable=False)
    stderr = Column(Text, default="", nullable=False)
    exit_code = Column(Integer, nullable=True)
    duration_ms = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="executions")
    user = relationship("User", back_populates="executions")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(String(36), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    project = relationship("Project", back_populates="comments")
    user = relationship("User", back_populates="comments")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info", nullable=False)  # invite, execution, comment, system
    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="notifications")

class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    project = relationship("Project", back_populates="activities")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True)
    action = Column(String(100), nullable=False)
    target = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class UserQuota(Base):
    __tablename__ = "user_quotas"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    max_projects = Column(Integer, default=25, nullable=False)
    max_executions_per_day = Column(Integer, default=200, nullable=False)
    max_storage_bytes = Column(Integer, default=100 * 1024 * 1024, nullable=False)  # 100MB
    current_storage_bytes = Column(Integer, default=0, nullable=False)
