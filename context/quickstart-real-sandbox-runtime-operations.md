# Context: QuickStart Real Sandbox Runtime Operations

Date: 2026-05-27
Repo: `/home/veenews/goneops-work`
Branch: `main`

## Files changed

- `apps/backend/src/quickstart-generator.service.ts`
- `apps/backend/src/quickstart-generator.service.spec.ts`
- `scripts/qa-quickstart.mjs`
- `tasks/quickstart-real-sandbox-runtime-operations.md`
- `progress/quickstart-real-sandbox-runtime-operations.md`
- `logs/quickstart-real-sandbox-runtime-operations.md`
- `memory/quickstart-real-sandbox-runtime-operations.md`
- `context/quickstart-real-sandbox-runtime-operations.md`
- `history/2026-05-27-quickstart-real-sandbox-runtime-operations.md`

## Implementation summary

Generated QuickStart ExpressJS/MySQL/Redis/RabbitMQ stacks now have real runtime operations from generated frontend controls through backend routes into MySQL, Redis, and RabbitMQ. Generated resource names derive from project slug/name.

## QA commands/results

- `npm --workspace apps/backend run build && npm --workspace apps/backend test` — passed.
- `npm run qa:quickstart` — passed, including generated Docker stack runtime operations.
- `sg docker -c 'docker compose config --quiet && docker compose ps --format json'` — passed.
- `git grep -nE '(ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|OPENSSH|PRIVATE) KEY|GITEA_TOKEN=.+|WOODPECKER_TOKEN=.+)' -- . ':!package-lock.json' || true` — no real token matches.

## Resume notes

If interrupted after this context file, run:

```bash
git status --short
npm run qa:quickstart
sg docker -c 'docker compose config --quiet && docker compose ps --format json'
git diff --check
```

Then stage, commit, and push.

## Boundaries

- Gitea repo creation and Woodpecker trigger remain `requires_configuration` unless tokens/config are present and verified.
