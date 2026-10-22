from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from app.db.session import get_db
from app.models.models import (
    User, Project, ProjectMember, ProjectRole, ProjectStatus, ProjectVisibility,
    ActivityEvent, ExecutionJob, File
)
from app.schemas.schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut, ProjectMemberOut, UserOut
)
from app.core.deps import get_current_user, get_user_project_role, verify_project_permission
from app.services.project_service import create_project_with_template, duplicate_project
from typing import List, Optional

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectOut])
async def list_projects(
    filter_by: Optional[str] = Query(None, description="owned, shared, public, archived"),
    search: Optional[str] = None,
    language: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Query projects where user is owner or member, or project is public
    query = select(Project).outerjoin(
        ProjectMember, Project.id == ProjectMember.project_id
    ).where(
        or_(
            Project.owner_id == current_user.id,
            ProjectMember.user_id == current_user.id,
            Project.visibility == ProjectVisibility.PUBLIC.value
        )
    ).distinct()

    if filter_by == "owned":
        query = query.where(Project.owner_id == current_user.id, Project.status == ProjectStatus.ACTIVE.value)
    elif filter_by == "shared":
        query = query.where(
            Project.owner_id != current_user.id,
            ProjectMember.user_id == current_user.id,
            Project.status == ProjectStatus.ACTIVE.value
        )
    elif filter_by == "archived":
        query = query.where(Project.status == ProjectStatus.ARCHIVED.value)
    else:
        query = query.where(Project.status == ProjectStatus.ACTIVE.value)

    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
    if language:
        query = query.where(Project.language == language.lower())

    query = query.order_by(Project.updated_at.desc())
    result = await db.execute(query)
    projects = result.scalars().all()

    output = []
    for p in projects:
        # Determine current user's role
        role = await get_user_project_role(p.id, current_user, db)
        # Count members
        m_count_res = await db.execute(
            select(func.count(ProjectMember.id)).where(ProjectMember.project_id == p.id)
        )
        m_count = m_count_res.scalar() or 1
        
        # Owner profile
        owner_res = await db.execute(select(User).where(User.id == p.owner_id))
        owner_obj = owner_res.scalar_one_or_none()

        out_item = ProjectOut(
            id=p.id,
            name=p.name,
            description=p.description,
            owner_id=p.owner_id,
            language=p.language,
            visibility=p.visibility,
            status=p.status,
            storage_usage=p.storage_usage,
            is_template=p.is_template,
            created_at=p.created_at,
            updated_at=p.updated_at,
            owner=UserOut.model_validate(owner_obj) if owner_obj else None,
            member_count=m_count,
            my_role=role or "viewer"
        )
        output.append(out_item)

    return output

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await create_project_with_template(db, current_user, data)
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        language=project.language,
        visibility=project.visibility,
        status=project.status,
        storage_usage=project.storage_usage,
        is_template=project.is_template,
        created_at=project.created_at,
        updated_at=project.updated_at,
        owner=UserOut.model_validate(current_user),
        member_count=1,
        my_role="owner"
    )

@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = await get_user_project_role(project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied to this project")

    m_count_res = await db.execute(
        select(func.count(ProjectMember.id)).where(ProjectMember.project_id == project.id)
    )
    m_count = m_count_res.scalar() or 1
    
    owner_obj = await db.get(User, project.owner_id)

    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        language=project.language,
        visibility=project.visibility,
        status=project.status,
        storage_usage=project.storage_usage,
        is_template=project.is_template,
        created_at=project.created_at,
        updated_at=project.updated_at,
        owner=UserOut.model_validate(owner_obj) if owner_obj else None,
        member_count=m_count,
        my_role=role
    )

@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = await get_user_project_role(project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.OWNER.value):
        raise HTTPException(status_code=403, detail="Only the project owner can modify settings")

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.visibility is not None:
        project.visibility = data.visibility
    if data.status is not None:
        project.status = data.status

    activity = ActivityEvent(
        project_id=project.id,
        user_id=current_user.id,
        action="project_updated",
        details="Updated project metadata/settings"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(project)
    
    owner_obj = await db.get(User, project.owner_id)
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        language=project.language,
        visibility=project.visibility,
        status=project.status,
        storage_usage=project.storage_usage,
        is_template=project.is_template,
        created_at=project.created_at,
        updated_at=project.updated_at,
        owner=UserOut.model_validate(owner_obj) if owner_obj else None,
        member_count=1,
        my_role=role
    )

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = await get_user_project_role(project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.OWNER.value):
        raise HTTPException(status_code=403, detail="Only the project owner can delete this project")

    await db.delete(project)
    await db.commit()
    return {"message": f"Project '{project.name}' deleted successfully"}

@router.post("/{project_id}/duplicate", response_model=ProjectOut)
async def duplicate_project_endpoint(
    project_id: str,
    new_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = await get_user_project_role(project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    cloned = await duplicate_project(db, current_user, project, new_name)
    return ProjectOut(
        id=cloned.id,
        name=cloned.name,
        description=cloned.description,
        owner_id=cloned.owner_id,
        language=cloned.language,
        visibility=cloned.visibility,
        status=cloned.status,
        storage_usage=cloned.storage_usage,
        is_template=cloned.is_template,
        created_at=cloned.created_at,
        updated_at=cloned.updated_at,
        owner=UserOut.model_validate(current_user),
        member_count=1,
        my_role="owner"
    )
