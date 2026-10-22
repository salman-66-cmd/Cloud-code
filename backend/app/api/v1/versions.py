from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.models import User, File, FileVersion, ProjectRole, ActivityEvent
from app.schemas.schemas import VersionCreate, VersionOut, FileOut
from app.core.deps import get_current_user, get_user_project_role, verify_project_permission
from typing import List

router = APIRouter(tags=["Version History"])

@router.get("/files/{file_id}/versions", response_model=List[VersionOut])
async def get_file_versions(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    file_obj = await db.get(File, file_id)
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")

    role = await get_user_project_role(file_obj.project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    res = await db.execute(
        select(FileVersion)
        .where(FileVersion.file_id == file_id)
        .order_by(FileVersion.version_num.desc())
    )
    versions = res.scalars().all()
    return [VersionOut.model_validate(v) for v in versions]

@router.post("/files/{file_id}/versions", response_model=VersionOut, status_code=status.HTTP_201_CREATED)
async def create_version_checkpoint(
    file_id: str,
    data: VersionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    file_obj = await db.get(File, file_id)
    if not file_obj or file_obj.is_folder:
        raise HTTPException(status_code=404, detail="File not found")

    role = await get_user_project_role(file_obj.project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.EDITOR.value):
        raise HTTPException(status_code=403, detail="Editor permissions required")

    res = await db.execute(
        select(func.max(FileVersion.version_num)).where(FileVersion.file_id == file_id)
    )
    latest_num = res.scalar() or 0

    new_version = FileVersion(
        file_id=file_id,
        version_num=latest_num + 1,
        content=file_obj.content,
        created_by_id=current_user.id,
        commit_message=data.commit_message or f"Checkpoint #{latest_num + 1}"
    )
    db.add(new_version)

    activity = ActivityEvent(
        project_id=file_obj.project_id,
        user_id=current_user.id,
        action="version_checkpoint",
        details=f"Created version {new_version.version_num} for {file_obj.name}"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(new_version)
    return VersionOut.model_validate(new_version)

@router.post("/files/{file_id}/versions/{version_id}/restore", response_model=FileOut)
async def restore_file_version(
    file_id: str,
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    file_obj = await db.get(File, file_id)
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")

    role = await get_user_project_role(file_obj.project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.EDITOR.value):
        raise HTTPException(status_code=403, detail="Editor permissions required to restore versions")

    version_obj = await db.get(FileVersion, version_id)
    if not version_obj or version_obj.file_id != file_id:
        raise HTTPException(status_code=404, detail="Version not found")

    # Update file content
    file_obj.content = version_obj.content
    file_obj.size = len(version_obj.content.encode('utf-8'))

    # Create a new version representing the restoration so history remains non-destructive
    res = await db.execute(
        select(func.max(FileVersion.version_num)).where(FileVersion.file_id == file_id)
    )
    latest_num = res.scalar() or 0
    restore_version = FileVersion(
        file_id=file_id,
        version_num=latest_num + 1,
        content=version_obj.content,
        created_by_id=current_user.id,
        commit_message=f"Restored from version {version_obj.version_num}"
    )
    db.add(restore_version)

    activity = ActivityEvent(
        project_id=file_obj.project_id,
        user_id=current_user.id,
        action="version_restored",
        details=f"Restored {file_obj.name} to version {version_obj.version_num}"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(file_obj)
    return FileOut.model_validate(file_obj)
