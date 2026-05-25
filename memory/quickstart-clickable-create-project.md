# GoneOps Memory: QuickStart Clickable Create Project Flow

- `/quickstart` should be treated as the simple QuickStart/Create Project surface, separate from the advanced `/` workspace.
- Create Project posts to `/quickstart/generate`, stores the generated response in browser localStorage keyed by `quickstart:<slug>`, then navigates to the backend-provided project URL.
- `/quickstart/projects/[slug]` attempts backend lookup first and falls back to localStorage for the generated README page.
- Frontend QuickStart tests now verify the real flow and should not be reverted to old static/mockup result panel assertions.
- Last full QA for this flow passed on 2026-05-25 18:47 +07.
