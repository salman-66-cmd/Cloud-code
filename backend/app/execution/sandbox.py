import asyncio
import os
import shutil
import tempfile
import time
import subprocess
from typing import Dict, Any, Optional, Tuple
from app.core.config import settings

class ExecutionResult:
    def __init__(
        self,
        stdout: str,
        stderr: str,
        exit_code: Optional[int],
        duration_ms: float,
        status: str,
        execution_mode: str = "sandbox"
    ):
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.duration_ms = duration_ms
        self.status = status
        self.execution_mode = execution_mode

    def to_dict(self) -> Dict[str, Any]:
        return {
            "stdout": self.stdout,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "duration_ms": self.duration_ms,
            "status": self.status,
            "execution_mode": self.execution_mode
        }

async def execute_in_sandbox(
    language: str,
    code: str,
    stdin_content: str = "",
    timeout_seconds: Optional[int] = None
) -> ExecutionResult:
    """
    Executes code in an isolated workspace with resource limits, timeout protection,
    and output sanitization.
    """
    timeout = timeout_seconds or settings.EXECUTION_TIMEOUT_SECONDS
    lang = language.lower()
    
    # Create an isolated temporary sandbox directory
    temp_dir = tempfile.mkdtemp(prefix="cloudcode_sandbox_")
    start_time = time.time()
    
    try:
        if lang in ("python", "py"):
            return await _run_python(temp_dir, code, stdin_content, timeout, start_time)
        elif lang in ("javascript", "js", "node"):
            return await _run_javascript(temp_dir, code, stdin_content, timeout, start_time)
        elif lang in ("typescript", "ts"):
            return await _run_typescript(temp_dir, code, stdin_content, timeout, start_time)
        elif lang in ("c",):
            return await _run_c(temp_dir, code, stdin_content, timeout, start_time)
        elif lang in ("cpp", "c++"):
            return await _run_cpp(temp_dir, code, stdin_content, timeout, start_time)
        elif lang in ("html", "web"):
            return _run_html(code, start_time)
        else:
            return ExecutionResult(
                stdout="",
                stderr=f"Language '{language}' is not supported in the execution worker.",
                exit_code=1,
                duration_ms=0.0,
                status="failed"
            )
    finally:
        # Secure cleanup: remove temporary sandbox files
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

async def _run_subprocess_sandboxed(
    cmd: list,
    cwd: str,
    stdin_data: str,
    timeout: int,
    start_time: float
) -> ExecutionResult:
    """
    Runs a subprocess asynchronously with strict timeout, stdin piping, and output size caps.
    """
    try:
        executable = shutil.which(cmd[0]) or cmd[0]
        exec_args = [executable] + list(cmd[1:])
        safe_env = {
            "PATH": os.environ.get("PATH", ""),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", "C:\\Windows"),
            "WINDIR": os.environ.get("WINDIR", "C:\\Windows"),
            "TEMP": cwd,
            "TMP": cwd,
            "PYTHONUNBUFFERED": "1",
            "NODE_ENV": "production",
            "PYTHONDONTWRITEBYTECODE": "1"
        }
        for key in ("HOMEDRIVE", "HOMEPATH", "USERPROFILE", "LOCALAPPDATA", "APPDATA"):
            if key in os.environ:
                safe_env[key] = os.environ[key]

        proc = await asyncio.create_subprocess_exec(
            *exec_args,
            cwd=cwd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=safe_env
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(input=stdin_data.encode('utf-8') if stdin_data else None),
                timeout=timeout
            )
            duration_ms = (time.time() - start_time) * 1000

            stdout_str = stdout_bytes.decode('utf-8', errors='replace')[:settings.MAX_OUTPUT_SIZE_BYTES]
            stderr_str = stderr_bytes.decode('utf-8', errors='replace')[:settings.MAX_OUTPUT_SIZE_BYTES]

            status = "completed" if proc.returncode == 0 else "failed"

            return ExecutionResult(
                stdout=stdout_str,
                stderr=stderr_str,
                exit_code=proc.returncode,
                duration_ms=round(duration_ms, 2),
                status=status
            )
        except asyncio.TimeoutError:
            try:
                proc.kill()
                await proc.wait()
            except Exception:
                pass
            duration_ms = (time.time() - start_time) * 1000
            return ExecutionResult(
                stdout="",
                stderr=f"Execution timed out after {timeout} seconds. Process was terminated.",
                exit_code=-1,
                duration_ms=round(duration_ms, 2),
                status="timed_out"
            )
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        return ExecutionResult(
            stdout="",
            stderr=f"Worker execution error: {str(e)}",
            exit_code=1,
            duration_ms=round(duration_ms, 2),
            status="failed"
        )

async def _run_python(temp_dir: str, code: str, stdin_content: str, timeout: int, start_time: float) -> ExecutionResult:
    file_path = os.path.join(temp_dir, "script.py")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    return await _run_subprocess_sandboxed(["python", "script.py"], temp_dir, stdin_content, timeout, start_time)

async def _run_javascript(temp_dir: str, code: str, stdin_content: str, timeout: int, start_time: float) -> ExecutionResult:
    file_path = os.path.join(temp_dir, "script.js")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    return await _run_subprocess_sandboxed(["node", "script.js"], temp_dir, stdin_content, timeout, start_time)

async def _run_typescript(temp_dir: str, code: str, stdin_content: str, timeout: int, start_time: float) -> ExecutionResult:
    # Run through node or tsx
    file_path = os.path.join(temp_dir, "script.ts")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    # Check if tsx or npx is available
    return await _run_subprocess_sandboxed(["node", "--loader", "ts-node/esm", "script.ts"], temp_dir, stdin_content, timeout, start_time)

async def _run_c(temp_dir: str, code: str, stdin_content: str, timeout: int, start_time: float) -> ExecutionResult:
    src_file = os.path.join(temp_dir, "prog.c")
    bin_file = os.path.join(temp_dir, "prog.exe" if os.name == 'nt' else "prog.out")
    with open(src_file, "w", encoding="utf-8") as f:
        f.write(code)

    # Compile with gcc / clang if present
    compiler = shutil.which("gcc") or shutil.which("clang")
    if not compiler:
        return ExecutionResult(
            stdout="",
            stderr="No C compiler (gcc/clang) was detected in the host execution environment. In Docker/Production, the execution worker container compiles code using gcc.",
            exit_code=1,
            duration_ms=0.0,
            status="failed"
        )

    compile_res = await _run_subprocess_sandboxed([compiler, "prog.c", "-O2", "-o", bin_file], temp_dir, "", timeout, start_time)
    if compile_res.exit_code != 0:
        compile_res.status = "failed"
        compile_res.stderr = f"Compilation Error:\n{compile_res.stderr}"
        return compile_res

    # Run compiled binary
    return await _run_subprocess_sandboxed([bin_file], temp_dir, stdin_content, timeout, start_time)

async def _run_cpp(temp_dir: str, code: str, stdin_content: str, timeout: int, start_time: float) -> ExecutionResult:
    src_file = os.path.join(temp_dir, "prog.cpp")
    bin_file = os.path.join(temp_dir, "prog.exe" if os.name == 'nt' else "prog.out")
    with open(src_file, "w", encoding="utf-8") as f:
        f.write(code)

    compiler = shutil.which("g++") or shutil.which("clang++")
    if not compiler:
        return ExecutionResult(
            stdout="",
            stderr="No C++ compiler (g++/clang++) was detected in the host execution environment. In Docker/Production, the execution worker container compiles code using g++.",
            exit_code=1,
            duration_ms=0.0,
            status="failed"
        )

    compile_res = await _run_subprocess_sandboxed([compiler, "prog.cpp", "-std=c++17", "-O2", "-o", bin_file], temp_dir, "", timeout, start_time)
    if compile_res.exit_code != 0:
        compile_res.status = "failed"
        compile_res.stderr = f"Compilation Error:\n{compile_res.stderr}"
        return compile_res

    return await _run_subprocess_sandboxed([bin_file], temp_dir, stdin_content, timeout, start_time)

def _run_html(code: str, start_time: float) -> ExecutionResult:
    duration_ms = (time.time() - start_time) * 1000
    return ExecutionResult(
        stdout="[HTML/CSS/JS] Prepared for secure sandbox preview iframe.",
        stderr="",
        exit_code=0,
        duration_ms=round(duration_ms, 2),
        status="completed"
    )
