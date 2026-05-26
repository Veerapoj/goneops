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
- Root `docker compose config --quiet`: passed.
- Secret-like token scan for tracked and untracked non-ignored files: passed.

## Troubleshooting notes

- An earlier `npm run qa:quickstart` run was interrupted while the generated Docker Compose stack had already started containers. The containers were cleaned up manually before retry.
- Retry windows were increased 2x: API health wait from 90 to 180 attempts and frontend HTTP wait from 60 to 120 attempts.
- Current Hermes gateway still needs Docker commands through `sg docker -c`.

## Next smallest step

Complete final git hygiene: stage, run whitespace check, commit, push, and verify `main` is synced with `origin/main`.
