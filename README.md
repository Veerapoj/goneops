# GoneOps

GoneOps is a local-first Internal Developer Platform for creating standardized projects without waiting on infrastructure or DevOps teams.

## MVP Status

MVP phases 1–6 are implemented and validated:

- Phase 1 — Foundation: Next.js frontend shell, NestJS backend, Docker Compose, persistent engineering memory directories, and health endpoints.
- Phase 2 — Project Generator: project name, stack, template, architecture preset selections, and backend generator API that returns validated generated files.
- Phase 3 — Design Generator: generated architecture docs, Mermaid context/system/deployment diagrams, and API contract docs.
- Phase 4 — Git + CI/CD: generated `.gitignore`, local Git bootstrap script, and GitHub Actions CI workflow template.
- Phase 5 — Observability Baseline: generated observability starter files, structured logging helpers, request_id/trace_id handling, health/readiness/liveness starter contracts, and local runtime validation.
- Phase 6 — UI Polish: responsive UI shell, dark-mode-ready styling, improved navigation states, and no-broken-page validation.

## Current Scope Boundary

Implemented paths are local-first and validated through build/test/lint, runtime API/UI checks, generated file checks, Docker Compose validation, and secret scanning.

Not claimed as implemented yet:

- UI-triggered disk persistence or downloadable archives for generated projects.
- Remote GitHub repository creation, repository sync/push, or actual remote GitHub Actions execution.
- External OpenTelemetry collector deployment, trace backend operation, metrics dashboards, or trace storage/search.
- Dedicated product routes for non-MVP sections beyond explicit `Coming Soon` placeholders.

## Requirements

- Node.js 22+
- npm 10+
- Docker with Compose

## Local Setup

```bash
cp .env.example .env
npm install
npm run build
npm run test
npm run lint
docker compose up -d
```

If Docker is missing on Ubuntu, install the system Docker Engine and Compose plugin:

```bash
./scripts/install-system-docker.sh
```

After installation, log out/in or run `newgrp docker` so non-root shells can use the Docker socket. In the current Hermes gateway session, Docker commands may need `sg docker -c '...'` until group membership refreshes.

Frontend: `http://localhost:3000`

Backend: `http://localhost:4000`

Health endpoint: `http://localhost:4000/health`

## QA

Run the full MVP gate:

```bash
npm run qa:mvp
```

Phase gates are also available:

```bash
npm run qa:phase1
npm run qa:phase2
npm run qa:phase3
npm run qa:phase4
npm run qa:phase5
npm run qa:phase6
```

## Project Generator API

```bash
curl -fsS http://localhost:4000/projects/options
curl -fsS -X POST http://localhost:4000/projects/generate \
  -H 'Content-Type: application/json' \
  -d '{"name":"Customer Portal","stack":"next-nest","template":"saas-dashboard","architecturePreset":"local-first"}'
```

Generated output uses relative paths and safe placeholder values only; local secrets must stay in `.env`.

## Generated Output Highlights

The generator returns validated output including:

- `README.md`
- `docker-compose.yml`
- `.env.example`
- `docs/architecture.md`
- `docs/context-diagram.md`
- `docs/system-diagram.md`
- `docs/deployment-diagram.md`
- `docs/api-contract.md`
- `.gitignore`
- `.github/workflows/ci.yml`
- `scripts/init-git.sh`
- `apps/api/src/observability.ts`
- `apps/api/src/health.ts`
- `docs/observability.md`

## Repository Hygiene

Secrets belong in `.env` only. `.env.example` contains safe placeholder values and is committed for local onboarding.
