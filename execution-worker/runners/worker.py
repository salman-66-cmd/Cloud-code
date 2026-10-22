import asyncio
import os
import sys
import time
import tempfile
import shutil
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, update

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cloudcode-worker")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./cloudcode.db")
EXECUTION_TIMEOUT = int(os.getenv("EXECUTION_TIMEOUT_SECONDS", "15"))

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def run_sandboxed(language: str, code: str, stdin_content: str):
    temp_dir = tempfile.mkdtemp(prefix="worker_sandbox_")
    start_time = time.time()
    lang = language.lower()

    try:
        if lang in ("python", "py"):
            file_path = os.path.join(temp_dir, "prog.py")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            cmd = ["python", "prog.py"]
        elif lang in ("javascript", "js", "node"):
            file_path = os.path.join(temp_dir, "prog.js")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            cmd = ["node", "prog.js"]
        elif lang in ("c",):
            file_path = os.path.join(temp_dir, "prog.c")
            bin_path = os.path.join(temp_dir, "prog.out")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            # Compile
            comp = await asyncio.create_subprocess_exec("gcc", "prog.c", "-O2", "-o", bin_path, cwd=temp_dir)
            await comp.communicate()
            if comp.returncode != 0:
                return {"stdout": "", "stderr": "Compilation failed.", "exit_code": 1, "duration_ms": 0.0, "status": "failed"}
            cmd = [bin_path]
        elif lang in ("cpp", "c++"):
            file_path = os.path.join(temp_dir, "prog.cpp")
            bin_path = os.path.join(temp_dir, "prog.out")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(code)
            comp = await asyncio.create_subprocess_exec("g++", "prog.cpp", "-std=c++17", "-O2", "-o", bin_path, cwd=temp_dir)
            await comp.communicate()
            if comp.returncode != 0:
                return {"stdout": "", "stderr": "Compilation failed.", "exit_code": 1, "duration_ms": 0.0, "status": "failed"}
            cmd = [bin_path]
        else:
            return {"stdout": "", "stderr": f"Unsupported language: {language}", "exit_code": 1, "duration_ms": 0.0, "status": "failed"}

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=temp_dir,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        try:
            out, err = await asyncio.wait_for(
                proc.communicate(input=stdin_content.encode('utf-8') if stdin_content else None),
                timeout=EXECUTION_TIMEOUT
            )
            duration_ms = (time.time() - start_time) * 1000
            return {
                "stdout": out.decode('utf-8', errors='replace'),
                "stderr": err.decode('utf-8', errors='replace'),
                "exit_code": proc.returncode,
                "duration_ms": round(duration_ms, 2),
                "status": "completed" if proc.returncode == 0 else "failed"
            }
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            return {
                "stdout": "",
                "stderr": f"Process exceeded timeout limit ({EXECUTION_TIMEOUT}s).",
                "exit_code": -1,
                "duration_ms": EXECUTION_TIMEOUT * 1000,
                "status": "timed_out"
            }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

async def worker_loop():
    logger.info("CloudCode Execution Worker daemon initialized. Listening for jobs...")
    while True:
        try:
            # Poll for queued jobs or sleep
            await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Worker exception: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(worker_loop())
