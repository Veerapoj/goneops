# QuickStart Real Sandbox Runtime Operations Progress

Date: 2026-05-27
Status: completed

## Progress update

Implemented the smallest valid increment to satisfy the real sandbox runtime operations contract for the representative ExpressJS/MySQL/Redis/RabbitMQ stack.

### Changed

- Generator now derives `.env.example` project resources from slug/name:
  - `PROJECT_SLUG=<slug>`
  - `DB_NAME=<slug_with_underscores>_db`
  - `DB_USER=<slug_with_underscores>_user`
- Generated Compose now includes slugged `container_name` entries for frontend, API, DB, Redis, RabbitMQ, Mongo, Postgres, and MinIO services.
- Generated Express backend now performs real MySQL user CRUD, real Redis SET/GET, and real RabbitMQ publish/consume/log operations.
- Generated frontend now provides direct buttons/forms for all required operations and renders live responses.
- QuickStart QA now fails if required endpoints, UI controls, dynamic names, or slugged runtime containers are absent.

### Runtime validation

`npm run qa:quickstart` passed and validated:

- Generated `goneops-demo` stack builds and starts with Docker Compose.
- `GET /health` returns `database=true`, `redis=true`, `rabbitmq=true`.
- `POST /users` creates a MySQL row.
- `GET /users` lists the created row.
- `DELETE /users/:id` removes the created row.
- `POST /redis/set` stores a value in Redis.
- `GET /redis/get` retrieves that value.
- `POST /rabbitmq/publish` publishes a message.
- `POST /rabbitmq/consume` consumes that message.
- `GET /rabbitmq/logs` includes publish and consume events.
- Generated frontend returns HTTP 200.
- Compose ps output includes slugged containers such as `goneops-demo-redis` and `goneops-demo-rabbitmq`.

### Other checks

- Backend build/tests passed.
- Platform Docker Compose config/ps passed via `sg docker -c`.
- Secret-like token scan passed for real tokens; empty `.env.example` token placeholders remain intentional.
