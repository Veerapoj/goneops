# GoneOps Memory: QuickStart Clickable Create Project Flow

- `/quickstart` should be treated as the simple QuickStart/Create Project surface, separate from the advanced `/` workspace.
- Create Project posts to `/quickstart/generate`, stores the generated response in browser localStorage keyed by `quickstart:<slug>`, then navigates to the backend-provided project URL.
- `/quickstart/projects/[slug]` attempts backend lookup first and falls back to localStorage for the generated README page.
- Frontend QuickStart tests now verify the real flow and should not be reverted to old static/mockup result panel assertions.
- Last full QA for this flow passed on 2026-05-25 18:47 +07.
- Playwright QuickStart e2e is part of root `qa:quickstart`; it uses Chrome for Testing Dev at `/home/veenews/.cache/chrome-for-testing/chrome-dev-150.0.7846.4/chrome-linux64/chrome` because bundled Playwright browser install is unsupported on Ubuntu 26.04.
- Playwright runtime defaults are backend `4100` and frontend `3100`; the frontend QuickStart fallback API base is `http://127.0.0.1:4100` unless `NEXT_PUBLIC_BACKEND_URL` is provided.
- Last full QA including Playwright passed on 2026-05-25 21:11 +07.
