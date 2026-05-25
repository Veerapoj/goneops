# QuickStart delete project confirmation log

## User request
Add deletion on the first QuickStart page: show created projects, let the user choose one, require typing the project name before deleting, and remove all data for that project after deletion.

## Implementation
- Backend in-memory generated project map now supports list and delete.
- Delete requires `confirmationName` equal to the generated project name. Wrong confirmation returns an error and keeps the project.
- Frontend stores a local project index, merges it with backend list, and removes both project cache and index entry after delete.

## Validation
- `npm run qa:quickstart` passed.
- Runtime API sequence validated `POST /quickstart/generate`, `GET /quickstart/projects`, failed wrong-name delete, successful exact-name delete, and final project `404`.
- Docker Compose and secret scan passed.
