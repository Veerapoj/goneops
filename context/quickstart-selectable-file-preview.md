# QuickStart selectable file preview context

Repo: `/home/veenews/goneops-work`
Branch: `main`

## Files changed
- `apps/frontend/app/quickstart/projects/[slug]/page.tsx`
- `apps/frontend/tests/quickstart.test.mjs`
- `apps/frontend/e2e/quickstart.spec.ts`

## Behavior
- Generated files are buttons.
- README is selected by default when present.
- Preview panel title is `File Preview`.
- Selected `.github/workflows/ci.yml` shows CI workflow content.

## QA commands
- `npm run qa:quickstart`
- `sg docker -c 'docker compose config --quiet && docker compose ps --format json'`
- secret-like token scan script

## Scope boundary
This changes the browser preview only. It does not add archive download, disk persistence, GitHub repo creation, or remote CI execution.
