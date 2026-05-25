# QuickStart delete project confirmation memory

QuickStart generated projects are currently stored in backend memory plus browser localStorage. Deleting a project should call `DELETE /quickstart/projects/:slug` with `{ confirmationName }`, then remove `quickstart:<slug>` and update `quickstart:projects` in localStorage. Exact project name confirmation is required before destructive deletion.
