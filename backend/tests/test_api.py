import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import engine, Base, AsyncSessionLocal
import os

@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("ok", "degraded")
        assert "version" in data

@pytest.mark.asyncio
async def test_auth_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register User A (becomes admin)
        reg_a = await client.post("/api/v1/auth/register", json={
            "email": "alice@cloudcode.io",
            "username": "alice",
            "password": "Password123!",
            "full_name": "Alice Developer"
        })
        assert reg_a.status_code == 201
        data_a = reg_a.json()
        token_a = data_a["access_token"]
        assert token_a is not None
        assert data_a["user"]["role"] == "admin"

        # 2. Register User B (collaborator)
        reg_b = await client.post("/api/v1/auth/register", json={
            "email": "bob@cloudcode.io",
            "username": "bob",
            "password": "Password123!",
            "full_name": "Bob Contributor"
        })
        assert reg_b.status_code == 201
        token_b = reg_b.json()["access_token"]
        assert token_b is not None

        # 3. Login test
        login_resp = await client.post("/api/v1/auth/login", json={
            "username_or_email": "alice",
            "password": "Password123!"
        })
        assert login_resp.status_code == 200
        assert "access_token" in login_resp.json()

        # 4. Get Current User profile
        me_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["username"] == "alice"

@pytest.mark.asyncio
async def test_project_and_file_crud():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login Alice
        login = await client.post("/api/v1/auth/login", json={
            "username_or_email": "alice",
            "password": "Password123!"
        })
        token = login.json()["access_token"]
        auth_hdr = {"Authorization": f"Bearer {token}"}

        # Create Python project
        proj_resp = await client.post("/api/v1/projects", json={
            "name": "Cloud Data Pipeline",
            "description": "Distributed data analytics project",
            "language": "python",
            "template": "python"
        }, headers=auth_hdr)
        assert proj_resp.status_code == 201
        project = proj_resp.json()
        proj_id = project["id"]
        assert project["name"] == "Cloud Data Pipeline"

        # Fetch files tree (should have main.py and README.md from template)
        files_resp = await client.get(f"/api/v1/projects/{proj_id}/files", headers=auth_hdr)
        assert files_resp.status_code == 200
        files = files_resp.json()
        assert len(files) >= 2
        main_py = next(f for f in files if f["name"] == "main.py")
        assert main_py is not None

        # Create a new subfolder
        folder_resp = await client.post(f"/api/v1/projects/{proj_id}/folders", json={
            "name": "utils"
        }, headers=auth_hdr)
        assert folder_resp.status_code == 201
        folder = folder_resp.json()
        assert folder["is_folder"] is True

        # Create a new file in utils folder
        new_file_resp = await client.post(f"/api/v1/projects/{proj_id}/files", json={
            "name": "math_helper.py",
            "parent_id": folder["id"],
            "content": "def square(x):\n    return x * x\n",
            "language": "python"
        }, headers=auth_hdr)
        assert new_file_resp.status_code == 201
        new_file = new_file_resp.json()
        assert new_file["path"] == "/utils/math_helper.py"

        # Update file content
        update_resp = await client.patch(f"/api/v1/files/{new_file['id']}", json={
            "content": "def square(x):\n    return x * x\n\ndef cube(x):\n    return x * x * x\n"
        }, headers=auth_hdr)
        assert update_resp.status_code == 200
        assert "cube" in update_resp.json()["content"]

        # Duplicate project
        dup_resp = await client.post(f"/api/v1/projects/{proj_id}/duplicate", headers=auth_hdr)
        assert dup_resp.status_code == 200
        dup_proj = dup_resp.json()
        assert dup_proj["id"] != proj_id
        assert "Copy" in dup_proj["name"]

@pytest.mark.asyncio
async def test_code_execution():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={
            "username_or_email": "alice",
            "password": "Password123!"
        })
        token = login.json()["access_token"]
        auth_hdr = {"Authorization": f"Bearer {token}"}

        # Create project
        proj = (await client.post("/api/v1/projects", json={
            "name": "Execution Demo",
            "language": "python"
        }, headers=auth_hdr)).json()

        # Run python code
        exec_resp = await client.post(f"/api/v1/projects/{proj['id']}/executions", json={
            "language": "python",
            "code": "print('CloudCode sandbox execution SUCCESS!')\nfor i in range(3): print(f'Step {i}')\n"
        }, headers=auth_hdr)
        assert exec_resp.status_code == 201
        res = exec_resp.json()
        assert res["status"] == "completed"
        assert "CloudCode sandbox execution SUCCESS!" in res["stdout"]
        assert "Step 2" in res["stdout"]

        # Run JS code
        js_exec = await client.post(f"/api/v1/projects/{proj['id']}/executions", json={
            "language": "javascript",
            "code": "console.log('Node worker execution: OK');\n"
        }, headers=auth_hdr)
        assert js_exec.status_code == 201
        assert "Node worker execution: OK" in js_exec.json()["stdout"]

@pytest.mark.asyncio
async def test_sharing_and_permissions():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Alice (owner)
        alice_login = await client.post("/api/v1/auth/login", json={
            "username_or_email": "alice",
            "password": "Password123!"
        })
        alice_token = alice_login.json()["access_token"]
        alice_hdr = {"Authorization": f"Bearer {alice_token}"}

        # Bob (collaborator)
        bob_login = await client.post("/api/v1/auth/login", json={
            "username_or_email": "bob",
            "password": "Password123!"
        })
        bob_token = bob_login.json()["access_token"]
        bob_hdr = {"Authorization": f"Bearer {bob_token}"}

        # Alice creates project
        proj = (await client.post("/api/v1/projects", json={
            "name": "Collaborative Team App",
            "language": "python"
        }, headers=alice_hdr)).json()

        # Bob tries to access project before invite -> should fail
        denied_resp = await client.get(f"/api/v1/projects/{proj['id']}", headers=bob_hdr)
        assert denied_resp.status_code == 403

        # Alice invites Bob
        invite_resp = await client.post(f"/api/v1/projects/{proj['id']}/invitations", json={
            "invitee_email": "bob@cloudcode.io",
            "role": "editor"
        }, headers=alice_hdr)
        assert invite_resp.status_code == 201
        invitation = invite_resp.json()
        token = invitation["token"]

        # Bob checks pending invitations
        pending_resp = await client.get("/api/v1/invitations/pending", headers=bob_hdr)
        assert pending_resp.status_code == 200
        assert len(pending_resp.json()) >= 1

        # Bob accepts invitation
        accept_resp = await client.post(f"/api/v1/invitations/{token}/accept", headers=bob_hdr)
        assert accept_resp.status_code == 200

        # Now Bob has access
        access_resp = await client.get(f"/api/v1/projects/{proj['id']}", headers=bob_hdr)
        assert access_resp.status_code == 200
        assert access_resp.json()["my_role"] == "editor"
