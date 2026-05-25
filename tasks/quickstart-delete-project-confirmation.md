# QuickStart delete project confirmation

Status: completed

## Scope
- Add project list management to the QuickStart homepage.
- Allow selecting a generated project.
- Require typing the exact project name before deletion.
- Remove all stored project data for that project from backend memory and browser cache.

## Completed
- Added backend `GET /quickstart/projects` project list endpoint.
- Added backend `DELETE /quickstart/projects/:slug` endpoint with exact-name confirmation.
- Added QuickStart homepage Created Projects panel with selection and delete confirmation.
- Added browser-cache cleanup for `quickstart:<slug>` and `quickstart:projects`.
- Added backend, static frontend, and Playwright E2E coverage.
