# QuickStart selectable file preview

Status: completed

## Scope
- Make generated project file list selectable.
- Show the selected generated file content in the preview panel instead of hardcoding README-only preview.
- Keep QuickStart separate from advanced workspace features.

## Completed
- Replaced static generated file list entries with clickable file buttons.
- Added selected-file state with README as default when available.
- Updated preview title to `File Preview` and content to selected file content.
- Added static and Playwright coverage for selecting `.github/workflows/ci.yml`.
