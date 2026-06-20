# GoneOps MVP

**DevOps DX Platform Control Dashboard** — Local-first full-stack demo.

> Warning: Not production-safe. Secrets are stored in plaintext for local development only.

## Architecture

```
Browser (:3000) → Nginx → React SPA
                  /api → Express Backend (:4000) → PostgreSQL, Redis, RabbitMQ
                            ↓ docker.sock
                       Sandbox Docker Stacks (per environment)
```

**Control plane** (fixed ports): Frontend :3000, Backend :4000, PostgreSQL :5432, Redis :6379, RabbitMQ :5672/:15672  
**Sandbox plane** (port range ≥20000): Per-environment Docker Compose stacks generated on disk.  
**Startup reconciliation**: Stale transitional states (>5 min environments, >10 min pipelines) are reconciled to `failed` on backend startup.  
**Lifecycle transitions**: Compare-and-set state updates prevent concurrent conflicting operations (HTTP 409 on conflict).  
**Pipeline scope**: Pipeline runs are scoped to environments with at most one active run per environment.

## Stack

- **Frontend:** React 18 + Vite + TailwindCSS + lucide-react
- **Backend:** Node.js + Express
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Message Queue:** RabbitMQ 3.12
- **Container:** Docker Compose

## Quick Start

```bash
# Prerequisites: Docker and Docker Compose installed

# 1. Clone the repository
git clone <repo-url> && cd GoneOps

# 2. Start the entire stack
docker compose up -d

# 3. Wait for all services (first time may take 1-2 minutes for image pulls)
docker compose ps

# 4. Open the dashboard
open http://localhost:3000
```

The `goneops-demo` project is pre-seeded with sample data.

## End-to-End Demo Flow

1. **Overview** — See pre-seeded goneops-demo project with Dev environment
2. **Create Project** — POST /api/projects with a new name
3. **Create Environment** — POST /api/projects/:id/environments (e.g., "dev")
4. **Generate Sandbox** — POST /api/projects/:id/generate-sandbox → writes real files to disk at /tmp/goneops-sandboxes/
5. **Run Sandbox** — POST /api/projects/:id/run → docker compose up -d (202 Accepted, poll status)
6. **Test API** — POST /api/projects/:id/test-api → proxies to sandbox /api/test, returns real JSON
7. **View Logs** — GET /api/projects/:id/logs → docker compose logs --tail from sandbox
8. **Run Pipeline** — POST /api/projects/:id/pipelines/run → 6-step CI/CD (202 Accepted, poll status)
9. **Browse Files** — GET /api/projects/:id/files → real generated files on disk
10. **View Secrets** — Secrets page shows masked environment variables with copy buttons

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Project detail + envs + services |
| POST | /api/projects/:id/environments | Create environment |
| POST | /api/projects/:id/generate-sandbox | Generate sandbox files + ports |
| POST | /api/projects/:id/run | Run sandbox (202) |
| POST | /api/projects/:id/stop | Stop sandbox |
| POST | /api/projects/:id/restart | Restart sandbox (202) |
| POST | /api/projects/:id/test-api | Test sandbox API |
| GET | /api/projects/:id/files | List sandbox files |
| GET | /api/projects/:id/files/content | Read file content |
| GET | /api/projects/:id/logs | Get sandbox container logs |
| GET | /api/projects/:id/pipelines | List pipeline runs |
| POST | /api/projects/:id/pipelines/run | Run pipeline (202) |

## Environment Variables

See `.env.example` for all configurable variables.

## Development

```bash
# Backend only
cd backend && npm install && npm run dev

# Frontend only
cd frontend && npm install && npm run dev

# With Docker (full stack)
docker compose up -d
```
