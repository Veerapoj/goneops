# QuickStart selectable file preview log

## Change
- User reported the right-side preview only showed README.
- Implemented selectable generated file buttons on `/quickstart/projects/[slug]`.
- Preview now displays `selectedFile.content` and selected file path.

## Validation
- `npm run qa:quickstart` passed.
- Playwright clicked `goneops-demo/.github/workflows/ci.yml` and verified `name: quickstart-ci` plus `actions/checkout@v4` were visible in the preview.
- Docker Compose validation passed using `sg docker -c`.
- Secret-like token scan passed.

## Troubleshooting
- Initial manual `curl` marker check against `/quickstart/projects/goneops-demo` did not find client-rendered labels. This was expected for this client-side data loading page, so browser E2E remains the source of truth for click validation.
