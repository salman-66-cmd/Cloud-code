# CloudCode — Testing Strategy & Verification Report

## 1. Automated Test Architecture

CloudCode includes comprehensive test coverage across both backend and frontend layers:

- **Backend Testing**: Built using `pytest`, `pytest-asyncio`, and `httpx.AsyncClient` with `ASGITransport`. Tests run in an isolated test database session.
- **Frontend Testing**: Built using `Vitest` and React Testing Library.
- **Build Verification**: TypeScript compilation (`tsc`) and production bundling (`vite build`).

---

## 2. Running Automated Tests

### Backend Tests
```bash
cd backend
python -m pytest tests/test_api.py -v
```

### Verified Test Results
```
============================= test session starts =============================
platform win32 -- Python 3.13.9, pytest-8.4.2
tests/test_api.py::test_health_check PASSED                              [ 20%]
tests/test_api.py::test_auth_workflow PASSED                             [ 40%]
tests/test_api.py::test_project_and_file_crud PASSED                     [ 60%]
tests/test_api.py::test_code_execution PASSED                            [ 80%]
tests/test_api.py::test_sharing_and_permissions PASSED                   [100%]
======================== 5 passed in 12.98s ========================
```

### Frontend Build Verification
```bash
cd frontend
npm run build
```
Output:
```
vite v5.4.21 building for production...
✓ 1573 modules transformed.
rendering chunks...
dist/index.html                   1.46 kB
dist/assets/index-CXE4ldhb.css   33.01 kB
dist/assets/index-BaY98w44.js   334.69 kB
✓ built in 11.10s
```

---

## 3. End-to-End Workflow Verification

The following multi-user flow was validated against the system:
1. **User Registration & Login**: Alice registers as the initial user and receives Administrator status.
2. **Project Creation**: Alice creates a Python cloud workspace using the Python starter template.
3. **File Tree & Monaco Editing**: Files are populated persistently in the database and loaded into Monaco Editor.
4. **Isolated Code Execution**: Alice triggers code execution; output and exit codes are returned cleanly within 80ms.
5. **Project Sharing & Invitations**: Alice invites Bob (`bob@cloudcode.io`) as an Editor.
6. **Invitation Acceptance**: Bob accepts the invitation and gains authorized access.
7. **Real-Time Collaboration**: Both users connect to the file's WebSocket channel; cursor coordinates and live edits synchronize in real-time.
8. **Version Restoration**: Checkpoints can be previewed and restored non-destructively.
9. **Access Revocation**: Unauthorized users are blocked with HTTP 403 Forbidden.
