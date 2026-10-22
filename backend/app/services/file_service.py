import re
import os
from typing import List, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from fastapi import HTTPException, status
from app.models.models import File, FileVersion, DocumentState, ActivityEvent, User
from app.schemas.schemas import FileCreate, FolderCreate, FileUpdate, FileMove, FileTreeItem

LANGUAGE_EXT_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".json": "json",
    ".md": "markdown",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".java": "java",
    ".sql": "sql",
    ".sh": "shell",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".txt": "plaintext"
}

def detect_language(filename: str) -> str:
    _, ext = os.path.splitext(filename.lower())
    return LANGUAGE_EXT_MAP.get(ext, "plaintext")

def sanitize_filename(name: str) -> str:
    name = name.strip()
    if not name or name in ('.', '..'):
        raise HTTPException(status_code=400, detail="Invalid file or folder name")
    if any(char in name for char in ['\\', '/', ':', '*', '?', '"', '<', '>', '|']):
        raise HTTPException(status_code=400, detail="Filename contains illegal characters")
    return name

def build_path(parent_path: str, name: str) -> str:
    if not parent_path or parent_path == "/":
        return f"/{name}"
    return f"{parent_path.rstrip('/')}/{name}"

async def create_file_or_folder(
    db: AsyncSession,
    project_id: str,
    user: User,
    name: str,
    parent_id: Optional[str] = None,
    is_folder: bool = False,
    content: str = "",
    language: Optional[str] = None
) -> File:
    clean_name = sanitize_filename(name)
    parent_path = "/"
    if parent_id:
        parent = await db.get(File, parent_id)
        if not parent or parent.project_id != project_id or not parent.is_folder:
            raise HTTPException(status_code=400, detail="Invalid parent folder")
        parent_path = parent.path

    path = build_path(parent_path, clean_name)

    # Check for duplicate sibling names
    existing = await db.execute(
        select(File).where(
            File.project_id == project_id,
            File.parent_id == parent_id,
            File.name == clean_name
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"A {'folder' if is_folder else 'file'} named '{clean_name}' already exists in this directory")

    if not language:
        language = detect_language(clean_name) if not is_folder else "folder"

    content_bytes = content.encode('utf-8') if not is_folder else b""
    file_obj = File(
        project_id=project_id,
        parent_id=parent_id,
        name=clean_name,
        path=path,
        is_folder=is_folder,
        content=content if not is_folder else "",
        language=language,
        size=len(content_bytes)
    )
    db.add(file_obj)
    await db.flush()

    if not is_folder:
        # Create initial version
        version = FileVersion(
            file_id=file_obj.id,
            version_num=1,
            content=content,
            created_by_id=user.id,
            commit_message="File created"
        )
        db.add(version)

        # Initialize document state for real-time collaboration
        doc_state = DocumentState(
            file_id=file_obj.id,
            state_data="",
            version=1
        )
        db.add(doc_state)

    activity = ActivityEvent(
        project_id=project_id,
        user_id=user.id,
        action="file_created" if not is_folder else "folder_created",
        details=f"Created {path}"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(file_obj)
    return file_obj

async def update_file_content(
    db: AsyncSession,
    file_id: str,
    user: User,
    content: str,
    create_snapshot: bool = False,
    commit_message: str = "Autosave"
) -> File:
    file_obj = await db.get(File, file_id)
    if not file_obj or file_obj.is_folder:
        raise HTTPException(status_code=404, detail="File not found")

    file_obj.content = content
    content_bytes = content.encode('utf-8')
    file_obj.size = len(content_bytes)

    if create_snapshot:
        # Get highest version
        res = await db.execute(
            select(func.max(FileVersion.version_num)).where(FileVersion.file_id == file_id)
        )
        latest_ver = res.scalar() or 0
        new_version = FileVersion(
            file_id=file_id,
            version_num=latest_ver + 1,
            content=content,
            created_by_id=user.id,
            commit_message=commit_message
        )
        db.add(new_version)

    await db.commit()
    await db.refresh(file_obj)
    return file_obj

async def rename_item(
    db: AsyncSession,
    file_id: str,
    user: User,
    new_name: str
) -> File:
    clean_name = sanitize_filename(new_name)
    item = await db.get(File, file_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.name == clean_name:
        return item

    # Check sibling duplicates
    existing = await db.execute(
        select(File).where(
            File.project_id == item.project_id,
            File.parent_id == item.parent_id,
            File.name == clean_name
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"An item named '{clean_name}' already exists in this folder")

    old_path = item.path
    parent_path = os.path.dirname(old_path)
    new_path = build_path(parent_path, clean_name)

    item.name = clean_name
    item.path = new_path
    if not item.is_folder:
        item.language = detect_language(clean_name)

    # If it was a folder, recursively update children paths
    if item.is_folder:
        await _update_children_paths(db, item.project_id, old_path, new_path)

    activity = ActivityEvent(
        project_id=item.project_id,
        user_id=user.id,
        action="item_renamed",
        details=f"Renamed {old_path} to {new_path}"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(item)
    return item

async def _update_children_paths(db: AsyncSession, project_id: str, old_prefix: str, new_prefix: str):
    res = await db.execute(select(File).where(File.project_id == project_id))
    all_files = res.scalars().all()
    for f in all_files:
        if f.path.startswith(old_prefix + "/"):
            f.path = new_prefix + f.path[len(old_prefix):]

async def delete_item_recursively(
    db: AsyncSession,
    file_id: str,
    user: User
) -> bool:
    item = await db.get(File, file_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    deleted_path = item.path
    project_id = item.project_id

    if item.is_folder:
        # Delete all nested files with matching path prefix
        res = await db.execute(
            select(File).where(
                File.project_id == project_id,
                File.path.startswith(deleted_path + "/")
            )
        )
        children = res.scalars().all()
        for c in children:
            await db.delete(c)

    await db.delete(item)

    activity = ActivityEvent(
        project_id=project_id,
        user_id=user.id,
        action="item_deleted",
        details=f"Deleted {deleted_path}"
    )
    db.add(activity)

    await db.commit()
    return True

async def move_item(
    db: AsyncSession,
    file_id: str,
    user: User,
    target_parent_id: Optional[str] = None
) -> File:
    item = await db.get(File, file_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    target_parent_path = "/"
    if target_parent_id:
        target = await db.get(File, target_parent_id)
        if not target or target.project_id != item.project_id or not target.is_folder:
            raise HTTPException(status_code=400, detail="Target destination must be a folder")
        # Cannot move folder into itself or its descendants
        if item.is_folder and (target.path == item.path or target.path.startswith(item.path + "/")):
            raise HTTPException(status_code=400, detail="Cannot move folder into itself or a subfolder")
        target_parent_path = target.path

    # Check for name conflict in target
    existing = await db.execute(
        select(File).where(
            File.project_id == item.project_id,
            File.parent_id == target_parent_id,
            File.name == item.name
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"An item named '{item.name}' already exists in target folder")

    old_path = item.path
    new_path = build_path(target_parent_path, item.name)

    item.parent_id = target_parent_id
    item.path = new_path

    if item.is_folder:
        await _update_children_paths(db, item.project_id, old_path, new_path)

    activity = ActivityEvent(
        project_id=item.project_id,
        user_id=user.id,
        action="item_moved",
        details=f"Moved from {old_path} to {new_path}"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(item)
    return item

async def get_project_file_tree(db: AsyncSession, project_id: str) -> List[FileTreeItem]:
    res = await db.execute(
        select(File).where(File.project_id == project_id).order_by(File.is_folder.desc(), File.name.asc())
    )
    files = res.scalars().all()
    
    # Map by id
    items_by_id = {}
    for f in files:
        items_by_id[f.id] = FileTreeItem(
            id=f.id,
            name=f.name,
            path=f.path,
            is_folder=f.is_folder,
            language=f.language,
            size=f.size,
            parent_id=f.parent_id,
            children=[]
        )

    tree: List[FileTreeItem] = []
    for item in items_by_id.values():
        if item.parent_id and item.parent_id in items_by_id:
            parent = items_by_id[item.parent_id]
            parent.children.append(item)
        else:
            tree.append(item)

    return tree
