# GoneOps

GoneOps is a local-first Internal Developer Platform for creating standardized projects without waiting on infrastructure or DevOps teams.

## Current Scope

This repository currently contains the MVP foundation and Phase 2 project generator:

- Next.js frontend shell
- NestJS backend foundation
- Docker Compose for PostgreSQL, Redis, and RabbitMQ
- Persistent engineering memory directories
- Phase task, progress, log, and context records
- Project Generator UI with project name, stack, template, and architecture preset selections
- Backend Project Generator API that returns validated generated structure and files

Architecture diagrams, CI/CD generation, and advanced observability are planned for later phases.

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

After installation, log out/in or run `newgrp docker` so non-root shells can use the Docker socket.

Frontend: `http://localhost:3000`

Backend: `http://localhost:4000`

Health endpoint: `http://localhost:4000/health`

## QA

Run the Phase 1 gate:

```bash
npm run qa:phase1
```

Run the Phase 2 gate:

```bash
npm run qa:phase2
```

## Project Generator API

```bash
curl -fsS http://localhost:4000/projects/options
curl -fsS -X POST http://localhost:4000/projects/generate \
  -H 'Content-Type: application/json' \
  -d '{"name":"Customer Portal","stack":"next-nest","template":"saas-dashboard","architecturePreset":"local-first"}'
```

Generated output uses relative paths and safe placeholder values only; local secrets must stay in `.env`.

## Repository Hygiene

Secrets belong in `.env` only. `.env.example` contains safe placeholder values and is committed for local onboarding.
