# QuickStart Local Self-Hosted Stack

Date: 2026-05-26
Status: completed

## Scope

Replace QuickStart hosted GitHub assumptions with a local-first stack:

- Source control: Gitea
- CI/CD: Woodpecker CI
- Runtime/sandbox: Docker Compose
- QuickStart UX: local-first Vercel-style generate flow with generated project URL, sandbox URL, CI/runtime metadata, logs, selectable file preview, and deletion controls.

## Completed work

- Added local platform metadata to QuickStart options for Gitea, Woodpecker CI, and Docker Compose.
- Changed generated CI output from `.github/workflows/*` to `.woodpecker.yml`.
- Added generated `scripts/local-cicd.sh` and `scripts/start-sandbox.sh`.
- Added automation metadata: repository URL, pipeline URL, sandbox URL, automation steps, and logs.
- Added `/quickstart/projects/[slug]/sandbox` route showing sandbox metadata, Gitea URL, Woodpecker pipeline URL, Docker Compose runtime, logs, and container status.
- Added platform Docker Compose services for local Gitea and Woodpecker baseline configuration.
- Strengthened generated Express/Nest Node starter output with real MySQL, Redis, RabbitMQ connectivity and `/jobs` runtime behavior.
- Added `scripts/qa-quickstart.mjs` for generated-stack Docker Compose runtime validation.
- Added live local automation path that persists generated workspaces, initializes Git, optionally creates/pushes to Gitea when tokens exist, optionally triggers Woodpecker when configured, and starts Docker Compose sandboxes.
- Doubled QuickStart QA wait/retry windows after the first run was interrupted by command timeout during Docker startup.

## Explicit boundaries

- Live Gitea repository creation and automatic push are marked as requiring configuration unless Gitea/Woodpecker endpoints and credentials are configured.
- Live Woodpecker pipeline triggering is not claimed as complete; generated `.woodpecker.yml` and local CI script are runtime-validated instead.
- No GitHub Actions workflow is generated for QuickStart local self-hosted mode.
- No real tokens, OAuth secrets, or access keys are committed.

## QA results

- `npm run qa:quickstart`: passed.
- Build: passed.
- Backend tests: passed, 15 tests.
- Frontend tests: passed, 17 tests.
- Lint: passed.
- Generated project file validation: passed.
- Generated `.woodpecker.yml` exists and `.github/workflows/*` is absent.
- Generated Docker Compose config validation: passed.
- Generated sandbox runtime startup: passed.
- Generated frontend HTTP 200 validation: passed.
- Generated API `/health` with MySQL/Redis/RabbitMQ connectivity: passed.
- Generated `/jobs` create/list validation: passed.
- Live `generateAndAutomate` sandbox validation: passed for MySQL/Redis/RabbitMQ health and frontend HTTP 200; cleanup removed workspace and compose project.
- Root `docker compose config --quiet`: passed.
- Secret-like token scan for tracked and untracked non-ignored files: passed.

## Troubleshooting notes

- Removed Playwright from the blocking `qa:quickstart` path; browser smoke remains available separately as `npm run e2e:quickstart`.
- Runtime QA initially exposed generated-stack issues before final pass: Redis/RabbitMQ env lines needed explicit separation, and the static sandbox frontend needed to listen on the configured `FRONTEND_PORT` instead of nginx port 80. Both were fixed and revalidated.
- Current Hermes gateway still needs Docker commands through `sg docker -c`.

## Final git state

- Commit: latest local self-hosted QuickStart commit on `main`.
- Branch: `main` is expected to be pushed after this state update.

## Next smallest step

Configure real local Gitea/Woodpecker credentials and webhooks when ready, then promote `requires_configuration` automation steps to live repository creation, push, and pipeline trigger after runtime verification.
