from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db.session import engine, Base
from app.api.v1 import (
    auth, projects, files, executions, sharing, versions, comments, notifications, health, ws
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cloudcode")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CloudCode database and storage...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schemas initialized.")
    yield
    logger.info("Shutting down CloudCode...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CloudCode - Cloud-Based Collaborative Code Workspace API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(projects.router, prefix=api_v1_prefix)
app.include_router(files.router, prefix=api_v1_prefix)
app.include_router(executions.router, prefix=api_v1_prefix)
app.include_router(sharing.router, prefix=api_v1_prefix)
app.include_router(versions.router, prefix=api_v1_prefix)
app.include_router(comments.router, prefix=api_v1_prefix)
app.include_router(notifications.router, prefix=api_v1_prefix)
app.include_router(health.router, prefix=api_v1_prefix)
app.include_router(ws.router)

@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs"
    }
