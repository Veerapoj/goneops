# QuickStart Live Interactive Sandbox

Status: completed
Date: 2026-05-26

## Scope

Turn the QuickStart sandbox from a static infrastructure/status page into the primary surface for the generated demo application.

## Completed

- Sandbox page now prioritizes a live generated frontend application iframe.
- Infrastructure metadata, logs, service health, workspace path, repo/pipeline URLs, and compose status remain as secondary panels.
- Generated frontend app includes interactive controls:
  - Check health.
  - Load database jobs.
  - Create a job through the generated backend API.
  - Read Redis latest-job state and consume a RabbitMQ message.
- Generated Node/Nest-compatible backend now exposes:
  - CORS for local sandbox browser calls.
  - `GET /health` with database/Redis/RabbitMQ checks.
  - `GET /jobs`, `POST /jobs`, `GET /jobs/:id` for real CRUD-like demo flow.
  - `GET /integrations` for Redis GET and RabbitMQ consume validation.
- Live automation response now includes `liveFrontendUrl` and `liveApiUrl` so `/quickstart/projects/<slug>/sandbox` can render the generated app.
- QuickStart workspace default now resolves back to the repo-level `.goneops/quickstart-projects` when backend runs from `apps/backend`.

## Runtime validation

Validated generated project `goneops-demo`:

- Sandbox route: `/quickstart/projects/goneops-demo/sandbox`
- Live frontend: `http://localhost:23229`
- Live API: `http://localhost:23230`
- Compose project: `qs-goneops-demo`
- Workspace: `/home/veenews/goneops-work/.goneops/quickstart-projects/goneops-demo`

Checks passed:

- Live frontend HTML contains Generated demo application controls.
- `GET /health` returned status ok with database=true, redis=true, rabbitmq=true.
- `POST /jobs` created a real job.
- `GET /jobs` returned seeded and created jobs from the running service.
- `GET /integrations` returned Redis latest job and consumed the RabbitMQ message for the created job.

## QA

- `npm run qa:quickstart` passed.
- Backend build/test/lint passed.
- Frontend build/test/lint passed.
- QuickStart generated Docker Compose smoke passed.
- Docker Compose platform config passed.
- Secret-like token scan passed.

## Notes

- Live Gitea repository creation and push remain conditional on `GITEA_TOKEN`.
- Woodpecker trigger remains conditional on `WOODPECKER_TOKEN`.
- The sandbox page now feels like a generated demo app first; logs/status are secondary.
