# GoneOps MVP

**DevOps DX Platform Control Dashboard** — Local-first full-stack demo. Create development environments, select runtime services, generate sandbox infrastructure, run CI/CD pipelines, preview apps, and test services from the UI.

> ⚠️ **Warning:** Not production-safe. Secrets are stored in plaintext for local development only.

---

## 🖥 System Requirements

| Requirement | Minimum |
|-------------|---------|
| Docker | 24.0+ |
| Docker Compose | 2.20+ (built into Docker Desktop) |
| OS | Linux, macOS, or Windows (WSL2) |
| RAM | 4 GB available |
| Disk | 2 GB free |
| Git | 2.30+ |

---

## 🚀 Quick Install

### 1. Clone

```bash
git clone https://github.com/Veerapoj/goneops.git
cd goneops
```

### 2. Start

```bash
docker compose up -d
```

First run pulls images (PostgreSQL, Redis, RabbitMQ) and builds frontend/backend — takes 2-5 minutes.

### 3. Verify

```bash
docker compose ps
```

All 5 services should show `Up`:

| Container | Port | Status |
|-----------|------|--------|
| goneops-frontend | :3000 | Up |
| goneops-backend | :4000 | Up |
| goneops-postgres | :5432 | healthy |
| goneops-redis | :6379 | Up |
| goneops-rabbitmq | :5672, :15672 | Up |

### 4. Open

[http://localhost:3000](http://localhost:3000)

The `goneops-demo` project is pre-seeded with sample data.

---

## 🛠 Configuration

### Port conflicts

If ports 3000-6379 are in use, override in `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "3001:80"   # change host port
  postgres:
    ports:
      - "5433:5432"
```

Then access at `http://localhost:3001`.

### Environment variables

Copy and edit:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Backend API port |
| `PGHOST` | postgres | PostgreSQL hostname |
| `PGPORT` | 5432 | PostgreSQL port |
| `PGDATABASE` | goneops | Database name |
| `PGUSER` | goneops | Database user |
| `PGPASSWORD` | goneops | Database password |
| `REDIS_HOST` | redis | Redis hostname |
| `REDIS_PORT` | 6379 | Redis port |
| `RABBITMQ_URL` | amqp://goneops:goneops@rabbitmq:5672 | RabbitMQ connection |
| `SANDBOX_BASE_DIR` | /tmp/goneops-sandboxes | Sandbox output directory |
| `SANDBOX_PORT_BASE` | 20000 | Starting port for sandbox stacks |

---

## 🧪 Running E2E Tests

The project includes **25 Playwright tests** covering all pages, API endpoints, and sandbox flow.

### Prerequisites

```bash
# Docker stack must be running
docker compose up -d

# Install Playwright browsers
cd tests/e2e
npx playwright install chromium
```

### Run tests

```bash
cd tests/e2e
npx playwright test
```

### View report

```bash
npx playwright show-report
```

---

## 💻 Development Without Docker

### Backend

```bash
cd backend
npm install
npm run dev
```

Requires PostgreSQL, Redis, and RabbitMQ running locally.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` with Vite dev server (proxies `/api` to `:4000`).

### Full stack

```bash
docker compose up -d
```

---

## 🔄 Demo Flow

1. **Overview** — See pre-seeded goneops-demo project with Dev environment
2. **Create Project** — Enter a project name and create
3. **Create Environment** — Select project, add "dev" environment
4. **Generate Sandbox** — Click Generate → writes real files to disk
5. **Run Sandbox** — Click Run → starts Docker containers
6. **Test API** — Click Test API → returns live JSON from sandbox app
7. **View Logs** — Open Logs page → see container logs
8. **Run Pipeline** — Click Run Pipeline → 6-step CI/CD executes
9. **Browse Files** — File Browser shows generated project files
10. **Secrets** — Masks sensitive values, copy connection strings

---

## 📦 Deploy on Another Machine

Clone and run on any machine with Docker — no extra setup needed.

```bash
# 1. Install Docker (Linux)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 2. Clone
git clone https://github.com/Veerapoj/goneops.git
cd goneops

# 3. Start
docker compose up -d

# 4. Verify
docker compose ps

# 5. Open
curl http://localhost:3000
```

**Key notes when deploying to a fresh machine:**

| Item | What to expect |
|------|----------------|
| Docker images | Auto-built on first `docker compose up -d` (2-5 min) |
| Database | Init schema + seed data auto-loaded from `database/init.sql` |
| Ports | Defaults: 3000, 4000, 5432, 6379, 5672, 15672 — change in `docker-compose.yml` if busy |
| Docker socket | Backend auto-mounts `/var/run/docker.sock` for sandbox Docker operations |
| Configuration | All defaults work out of the box — no `.env` file required |
| node_modules | Built inside Docker images — not needed on host |
| ContextOS files | `.contextos/`, `agents/`, `runtime/`, `skills/`, `workflows/` are optional orchestration configs — not needed to run the app |

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| `docker: not found` | Install Docker: https://docs.docker.com/get-docker/ |
| Port already in use | Change host ports in `docker-compose.yml` |
| Backend can't connect to DB | Wait for PostgreSQL health check (10-20s) |
| Sandbox fails to start | Ensure Docker socket is mounted (`/var/run/docker.sock`) |
| `docker compose` not found | Use `docker-compose` (v1) or upgrade to Docker Compose v2 |
| Permission denied on /var/run/docker.sock | Add user to `docker` group: `sudo usermod -aG docker $USER` |

---

## 🧱 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + lucide-react |
| Backend | Node.js + Express |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Message Queue | RabbitMQ 3.12 |
| Container | Docker Compose |

---

## 📁 Project Structure

```
├── backend/          # Express API server
│   ├── src/
│   │   ├── lib/          # DB, Redis, MQ clients
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic
│   │   ├── sandbox/      # Generator, runner, ports, README
│   │   └── operations/   # Startup reconciler
│   └── test/             # Smoke tests
├── frontend/         # React SPA
│   └── src/
│       ├── api/          # Axios client
│       ├── context/      # ProjectContext (localStorage)
│       ├── layout/       # Sidebar, Topbar, Layout
│       └── pages/        # 12 pages
├── database/         # init.sql (8 tables + seed data)
├── sandbox-template/ # Generated app template
├── tests/e2e/        # Playwright E2E tests
└── docker-compose.yml
```

---

## 📄 License

MIT
