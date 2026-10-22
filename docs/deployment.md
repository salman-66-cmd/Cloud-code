# CloudCode — Deployment Guide

## 1. Local Development Setup (Quick Start)

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Running the Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be live at: `http://127.0.0.1:8000/docs`

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
CloudCode UI will be live at: `http://localhost:5173`

---

## 2. Docker Compose Multi-Container Production Stack

The entire stack can be launched with a single command:
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Build and start containers
docker compose up -d --build

# 3. Check container status
docker compose ps
```

### Services Launched:
- `cloudcode-frontend`: Nginx web server on port 80 (and 3000)
- `cloudcode-backend`: FastAPI async API server on port 8000
- `cloudcode-worker`: Isolated execution worker
- `cloudcode-postgres`: PostgreSQL 16 on port 5432
- `cloudcode-redis`: Redis 7 on port 6379

---

## 3. Production Cloud Deployment (AWS / GCP / Kubernetes)

1. **Database**: Use managed Amazon RDS (PostgreSQL) or Google Cloud SQL. Set `DATABASE_URL` to the managed instance endpoint.
2. **Redis**: Use Amazon ElastiCache or Redis Enterprise for ephemeral session coordination.
3. **Execution Workers**: Deploy workers in a Kubernetes namespace with `NetworkPolicy` restricting egress to external internet or internal VPC resources.
4. **Ingress**: Terminate TLS at the cloud load balancer (AWS ALB / Cloudflare) and forward HTTP/WebSockets to the frontend/backend services.
