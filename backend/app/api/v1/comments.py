from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import User, Project, Comment, ActivityEvent, ProjectRole
from app.schemas.schemas import CommentCreate, CommentOut, ActivityOut, UserOut
from app.core.deps import get_current_user, get_user_project_role
from typing import List

router = APIRouter(tags=["Comments & Activity"])

@router.get("/projects/{project_id}/comments", response_model=List[CommentOut])
async def list_project_comments(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    res = await db.execute(
        select(Comment)
        .where(Comment.project_id == project_id)
        .order_by(Comment.created_at.asc())
    )
    comments = res.scalars().all()
    output = []
    for c in comments:
        user_obj = await db.get(User, c.user_id)
        output.append(
            CommentOut(
                id=c.id,
                project_id=c.project_id,
                file_id=c.file_id,
                user_id=c.user_id,
                parent_id=c.parent_id,
                content=c.content,
                created_at=c.created_at,
                updated_at=c.updated_at,
                user=UserOut.model_validate(user_obj) if user_obj else None
            )
        )
    return output

@router.post("/projects/{project_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(
    project_id: str,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    comment = Comment(
        project_id=project_id,
        file_id=data.file_id,
        user_id=current_user.id,
        parent_id=data.parent_id,
        content=data.content
    )
    db.add(comment)

    activity = ActivityEvent(
        project_id=project_id,
        user_id=current_user.id,
        action="comment_added",
        details=f"{current_user.username} commented on project"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(comment)

    return CommentOut(
        id=comment.id,
        project_id=comment.project_id,
        file_id=comment.file_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        user=UserOut.model_validate(current_user)
    )

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    comment = await db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    role = await get_user_project_role(comment.project_id, current_user, db)
    if not (comment.user_id == current_user.id or role == ProjectRole.OWNER.value):
        raise HTTPException(status_code=403, detail="Cannot delete this comment")

    await db.delete(comment)
    await db.commit()
    return {"message": "Comment deleted"}

@router.get("/projects/{project_id}/activity", response_model=List[ActivityOut])
async def list_project_activity(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    res = await db.execute(
        select(ActivityEvent)
        .where(ActivityEvent.project_id == project_id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(100)
    )
    events = res.scalars().all()
    return [ActivityOut.model_validate(e) for e in events]
