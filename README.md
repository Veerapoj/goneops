# GoneOps

GoneOps is a local-first Internal Developer Platform for creating standardized projects without waiting on infrastructure or DevOps teams.

## Phase 1 Scope

This repository currently contains the MVP foundation:

- Next.js frontend shell
- NestJS backend foundation
- Docker Compose for PostgreSQL, Redis, and RabbitMQ
- Persistent engineering memory directories
- Phase 1 task and progress records

Project generation, architecture diagrams, CI/CD generation, and advanced observability are planned for later phases.

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

Frontend: `http://localhost:3000`

Backend: `http://localhost:4000`

Health endpoint: `http://localhost:4000/health`

## QA

Run the Phase 1 gate:

```bash
npm run qa:phase1
```

## Repository Hygiene

Secrets belong in `.env` only. `.env.example` contains safe placeholder values and is committed for local onboarding.
