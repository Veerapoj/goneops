# Testing Report

Date: 2026-06-20  
Stage: testing  
Result: PASS

## Automated validation

- Frontend production build: PASS (`npm run build`, 1,637 modules)
- Backend JavaScript syntax validation: PASS (all files under `backend/src`)
- Docker Compose configuration validation: PASS
- Full-stack smoke suite: PASS (15 passed, 0 failed)

The smoke suite exercised the running Docker Compose stack through ports 13000
and 14000. It verified frontend SPA routing, backend health, seeded data,
project and environment creation, project ownership enforcement, real sandbox
file generation, path traversal rejection, secret masking, database metadata
masking, Docker sandbox start/restart/stop, PostgreSQL/Redis/RabbitMQ
connectivity, container logs, and all six persisted pipeline steps.

## Reproduction

```bash
docker compose -f docker-compose.yml -f test-compose.override.yml up -d --build
npm --prefix frontend run build
find backend/src -type f -name '*.js' -print0 | xargs -0 -n1 node --check
docker compose config -q
GONEOPS_API_URL=http://localhost:14000/api \
GONEOPS_FRONTEND_URL=http://localhost:13000 \
npm --prefix backend run test:smoke
```

Raw smoke output: `test-results/testing-stage.log`
