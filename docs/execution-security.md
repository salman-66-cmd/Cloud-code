# CloudCode — Execution Sandbox Security Architecture

## 1. Security Threat Model

In a cloud code execution environment, untrusted user code poses critical threats:
- **Host Compromise**: Accessing host filesystem, environment variables, or docker sockets.
- **Denial of Service (DoS)**: Infinite loops, fork bombs, and memory exhaustion.
- **Data Exfiltration**: Reaching private internal network services or databases.
- **Cross-Site Scripting (XSS)**: Rendering malicious user HTML inside the application DOM.

---

## 2. Security Countermeasures Implemented

### A. Dedicated Disposable Sandboxes
- Code is written to a temporary, randomly generated sandbox directory (`/tmp/cloudcode_sandbox_*`).
- All temporary files are wiped unconditionally after execution finishes (`shutil.rmtree`).

### B. Non-Root Execution
- Production execution workers run under an unprivileged user (`runneruser`, UID 1001, GID 1001).
- No sudo, no privileged container flags, and no mounting of the host Docker socket (`docker.sock`).

### C. Resource Boundaries & Quotas
- **Timeout**: Strict 15-second process timeout enforced asynchronously (`asyncio.wait_for`). Processes exceeding this are sent `SIGKILL`.
- **Memory Limit**: 128MB per worker process.
- **Output Capping**: Standard output and standard error are truncated at 64KB (`settings.MAX_OUTPUT_SIZE_BYTES`) to prevent buffer bloat.
- **File System Limits**: Temporary workspaces have restricted write bounds.

### D. Web Preview Sandboxing
- HTML/CSS/JS preview runs in an isolated `iframe` element configured with `sandbox="allow-scripts"`.
- It explicitly denies `allow-same-origin`, preventing untrusted scripts from reading parent cookies, local storage, or session tokens.

### E. Secret Protection
- Host system environment variables containing production database credentials or secret keys are stripped from execution subprocesses. Only standard OS runtime paths are passed.
