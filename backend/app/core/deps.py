from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.models import User, Project, ProjectMember, ProjectRole, UserRole
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    
    user_id = decode_access_token(token)
    if not user_id:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exception
    
    return user

async def get_current_active_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def get_user_project_role(
    project_id: str,
    user: User,
    db: AsyncSession
) -> Optional[str]:
    # Check if user is system admin
    if user.role == UserRole.ADMIN.value:
        return ProjectRole.OWNER.value
    
    # Check if project exists and user is owner
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        return None
    
    if project.owner_id == user.id:
        return ProjectRole.OWNER.value
    
    # Check membership
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id
        )
    )
    membership = result.scalar_one_or_none()
    if membership:
        return membership.role
    
    # If project is public, grant viewer role
    if project.visibility == "public":
        return ProjectRole.VIEWER.value
    
    return None

def verify_project_permission(user_role: Optional[str], required_role: str) -> bool:
    if not user_role:
        return False
    
    role_weights = {
        ProjectRole.VIEWER.value: 1,
        ProjectRole.RUNNER.value: 2,
        ProjectRole.EDITOR.value: 3,
        ProjectRole.OWNER.value: 4
    }
    
    user_weight = role_weights.get(user_role, 0)
    required_weight = role_weights.get(required_role, 0)
    
    return user_weight >= required_weight
