# QuickStart Real Sandbox Runtime Operations

Status: completed
Date: 2026-05-27

## Scope

Make the generated QuickStart sandbox a real runtime operations demo, not a static/mock UI.

## Completed

- Dynamic project-derived runtime names are generated from the project slug:
  - `PROJECT_SLUG=goneops-demo`
  - `DB_NAME=goneops_demo_db`
  - `DB_USER=goneops_demo_user`
  - Docker `container_name` values such as `goneops-demo-redis` and `goneops-demo-rabbitmq`.
- ExpressJS + MySQL + Redis + RabbitMQ representative stack now exposes real runtime endpoints:
  - `GET /health` checks API, MySQL, Redis, and RabbitMQ connectivity.
  - `POST /users` inserts a real MySQL row.
  - `GET /users` reads real MySQL rows.
  - `DELETE /users/:id` deletes real MySQL rows.
  - `POST /redis/set` stores a caller-provided key/value in Redis.
  - `GET /redis/get` reads the caller-provided key from Redis.
  - `POST /rabbitmq/publish` publishes a real RabbitMQ message.
  - `POST /rabbitmq/consume` consumes a real RabbitMQ message and returns logs.
  - `GET /rabbitmq/logs` returns live publish/consume logs.
- Generated frontend `index.html` now has buttons/forms for Health Check, Create User, List Users, Delete User, Redis SET, Redis GET, RabbitMQ Publish, and RabbitMQ Consume/Logs; each control uses `fetch()` against the generated API.
- Existing `/jobs` and `/integrations` endpoints remain for backwards compatibility.
- OpenAPI, README/API examples, generator validation markers, unit tests, and runtime QA were extended for the required endpoints and dynamic naming.

## QA required for this task

- [x] Backend build and tests.
- [x] `npm run qa:quickstart` generated stack runtime QA.
- [x] Docker Compose platform validation with `sg docker -c 'docker compose config --quiet && docker compose ps --format json'`.
- [x] Secret-like token scan; only empty documented `.env.example` token placeholders exist.

## Boundaries

- No live Gitea repository creation or Woodpecker trigger was claimed; those still require configured tokens/OAuth/webhooks.
- Demo credentials in generated `.env.example` are local sandbox-only placeholders.
