# Memory: QuickStart Real Sandbox Runtime Operations

Date: 2026-05-27

## Decision memory

- QuickStart generated runtime demos must not be static/mocked. For the representative ExpressJS/MySQL/Redis/RabbitMQ stack, generated UI controls must call generated API endpoints, and those endpoints must use real MySQL, Redis, and RabbitMQ clients.
- Dynamic resource naming is based on the project slug:
  - hyphen slug for Compose `container_name` values (`goneops-demo-redis`);
  - underscore slug for DB values (`goneops_demo_db`, `goneops_demo_user`).
- Keep `/jobs` for backwards compatibility, but the user-facing required demo is `/users`, `/redis/*`, and `/rabbitmq/*`.
- QA should fail on missing generated UI buttons, missing backend routes, missing slug-derived env names, or missing slugged Compose containers.

## Runtime QA pattern

For generated QuickStart Docker QA:

1. Remove stale slugged fixed containers before `up -d --build`.
2. Validate `docker compose config --quiet`.
3. Start with `sg docker -c`.
4. Wait for `/health` to return all service booleans true.
5. Validate database, Redis, RabbitMQ endpoints independently.
6. Validate generated frontend HTTP 200.
7. Validate Compose ps includes slugged containers.
8. Tear down with `docker compose down -v --remove-orphans`.

## Security memory

- Empty `GITEA_TOKEN=` and `WOODPECKER_TOKEN=` placeholders in `.env.example` are intentional; do not commit real values.
- Do not claim live Gitea/Woodpecker automation unless credentials/config are present and the full path is runtime-verified.
