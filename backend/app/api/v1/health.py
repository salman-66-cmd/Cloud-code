from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.schemas.schemas import HealthOut
from app.core.config import settings
from datetime import datetime, timezone
import shutil

router = APIRouter(tags=["Health & System"])

@router.get("/health", response_model=HealthOut)
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # Check worker runtimes
    python_ok = shutil.which("python") is not None
    node_ok = shutil.which("node") is not None
    worker_status = f"active (Python: {python_ok}, Node: {node_ok})"

    return HealthOut(
        status="ok" if db_status == "healthy" else "degraded",
        version=settings.VERSION,
        database=db_status,
        timestamp=datetime.now(timezone.utc),
        worker_status=worker_status
    )

@router.get("/ready")
async def readiness_probe(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"ready": True}
