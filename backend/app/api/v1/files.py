from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import User, Project, File, ProjectRole
from app.schemas.schemas import (
    FileCreate, FolderCreate, FileUpdate, FileMove, FileOut, FileTreeItem
)
from app.core.deps import get_current_user, get_user_project_role, verify_project_permission
from app.services.file_service import (
    create_file_or_folder, update_file_content, rename_item,
    delete_item_recursively, move_item, get_project_file_tree
)
from typing import List

router = APIRouter(tags=["Files & Folders"])

@router.get("/projects/{project_id}/files", response_model=List[FileTreeItem])
async def list_files(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied to this project")

    return await get_project_file_tree(db, project_id)

@router.post("/projects/{project_id}/files", response_model=FileOut, status_code=status.HTTP_201_CREATED)
async def create_file_endpoint(
    project_id: str,
    data: FileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.EDITOR.value):
        raise HTTPException(status_code=403, detail="Editor permissions required to create files")

    file_obj = await create_file_or_folder(
        db=db,
        project_id=project_id,
        user=current_user,
        name=data.name,
        parent_id=data.parent_id,
        is_folder=False,
        content=data.content or "",
        language=data.language
    )
    return FileOut.model_validate(file_obj)

@router.post("/projects/{project_id}/folders", response_model=FileOut, status_code=status.HTTP_201_CREATED)
async def create_folder_endpoint(
    project_id: str,
    data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.EDITOR.value):
        raise HTTPException(status_code=403, detail="Editor permissions required to create folders")

    folder_obj = await create_file_or_folder(
        db=db,
        project_id=project_id,
        user=current_user,
        name=data.name,
        parent_id=data.parent_id,
        is_folder=True
    )
    return FileOut.model_validate(folder_obj)

@router.get("/files/{file_id}", response_model=FileOut)
async def get_file_content(
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

    return FileOut.model_validate(file_obj)

@router.patch("/files/{file_id}", response_model=FileOut)
async def update_file_endpoint(
    file_id: str,
    data: FileUpdate,
    create_snapshot: bool = False,
    commit_message: str = "Saved via editor",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    file_obj = await db.get(File, file_id)
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")

    role = await get_user_project_role(file_obj.project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.EDITOR.value):
        raise HTTPException(status_code=403, detail="Editor permissions required to save changes")

    # Rename if name provided
    if data.name and data.name != file_obj.name:
        file_obj = await rename_item(db, file_id, current_user, data.name)

    # Update content if provided
    if data.content is not None and not file_obj.is_folder:
        file_obj = await update_file_content(
            db=db,
            file_id=file_id,
            user=current_user,
            content=data.content,
            create_snapshot=create_snapshot,
            commit_message=commit_message
        )

    return FileOut.model_validate(file_obj)

@router.delete("/files/{file_id}")
async def delete_file_endpoint(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    file_obj = await db.get(File, file_id)
    if not file_obj:
        raise HTTPException(status_code=404, detail="Item not found")

    role = await get_user_project_role(file_obj.project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.EDITOR.value):
        raise HTTPException(status_code=403, detail="Editor permissions required to delete items")

    await delete_item_recursively(db, file_id, current_user)
    return {"message": "Deleted successfully"}

@router.post("/files/{file_id}/move", response_model=FileOut)
async def move_file_endpoint(
    file_id: str,
    data: FileMove,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    file_obj = await db.get(File, file_id)
    if not file_obj:
        raise HTTPException(status_code=404, detail="Item not found")

    role = await get_user_project_role(file_obj.project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.EDITOR.value):
        raise HTTPException(status_code=403, detail="Editor permissions required to move items")

    moved = await move_item(db, file_id, current_user, data.target_parent_id)
    return FileOut.model_validate(moved)
