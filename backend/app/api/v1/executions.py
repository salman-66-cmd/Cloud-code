from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import (
    User, Project, File, ExecutionJob, JobStatus, ProjectRole, ActivityEvent, Notification
)
from app.schemas.schemas import ExecutionCreate, ExecutionOut
from app.core.deps import get_current_user, get_user_project_role, verify_project_permission
from app.execution.sandbox import execute_in_sandbox
from datetime import datetime, timezone
from typing import List

router = APIRouter(tags=["Executions"])

@router.post("/projects/{project_id}/executions", response_model=ExecutionOut, status_code=status.HTTP_201_CREATED)
async def run_code(
    project_id: str,
    data: ExecutionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = await get_user_project_role(project_id, current_user, db)
    if not verify_project_permission(role, ProjectRole.RUNNER.value):
        raise HTTPException(status_code=403, detail="Runner permissions required to execute code")

    code_to_run = data.code
    lang = data.language or project.language
    file_id = data.file_id

    # If code was not provided directly, fetch from file
    if not code_to_run and file_id:
        file_obj = await db.get(File, file_id)
        if file_obj and not file_obj.is_folder:
            code_to_run = file_obj.content
            lang = file_obj.language

    if not code_to_run:
        raise HTTPException(status_code=400, detail="No code or valid file provided to execute")

    # Create job in database
    job = ExecutionJob(
        project_id=project_id,
        file_id=file_id,
        user_id=current_user.id,
        language=lang,
        status=JobStatus.RUNNING.value,
        stdin_content=data.stdin_content or "",
        stdout="",
        stderr=""
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Execute in sandbox asynchronously
    result = await execute_in_sandbox(
        language=lang,
        code=code_to_run,
        stdin_content=data.stdin_content or ""
    )

    # Persist job outcome
    job.status = result.status
    job.stdout = result.stdout
    job.stderr = result.stderr
    job.exit_code = result.exit_code
    job.duration_ms = result.duration_ms
    job.completed_at = datetime.now(timezone.utc)

    # Log activity
    activity = ActivityEvent(
        project_id=project_id,
        user_id=current_user.id,
        action="code_executed",
        details=f"Executed {lang} script. Status: {job.status} ({job.duration_ms:.1f}ms)"
    )
    db.add(activity)

    await db.commit()
    await db.refresh(job)
    return ExecutionOut.model_validate(job)

@router.get("/projects/{project_id}/executions", response_model=List[ExecutionOut])
async def list_project_executions(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role = await get_user_project_role(project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    res = await db.execute(
        select(ExecutionJob)
        .where(ExecutionJob.project_id == project_id)
        .order_by(ExecutionJob.created_at.desc())
        .limit(50)
    )
    jobs = res.scalars().all()
    return [ExecutionOut.model_validate(j) for j in jobs]

@router.get("/executions/{execution_id}", response_model=ExecutionOut)
async def get_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await db.get(ExecutionJob, execution_id)
    if not job:
        raise HTTPException(status_code=404, detail="Execution record not found")

    role = await get_user_project_role(job.project_id, current_user, db)
    if not role:
        raise HTTPException(status_code=403, detail="Access denied")

    return ExecutionOut.model_validate(job)

@router.post("/executions/{execution_id}/cancel", response_model=ExecutionOut)
async def cancel_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await db.get(ExecutionJob, execution_id)
    if not job:
        raise HTTPException(status_code=404, detail="Execution record not found")

    if job.status in (JobStatus.QUEUED.value, JobStatus.RUNNING.value):
        job.status = JobStatus.CANCELLED.value
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(job)

    return ExecutionOut.model_validate(job)
