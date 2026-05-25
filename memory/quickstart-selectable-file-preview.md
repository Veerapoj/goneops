# QuickStart selectable file preview memory

The QuickStart generated project route uses client-side fetch/cache loading for generated project data. For file preview behavior, validate with Playwright/browser E2E rather than plain HTML curl. The default selected file should be README when present, and clicking any generated file button should update the preview to that file's exact `content`.
