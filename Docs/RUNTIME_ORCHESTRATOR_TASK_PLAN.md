# Runtime Orchestrator — Task Plan (Planning Stage)

Workflow: `ctx_01KWV6FYPKB37QRMN888ZMD1WT` · Stage: `planning`
Input: `Docs/UNAPPROVED_RUNTIME_ORCHESTRATOR_DRAFT.md`

This is the planning-stage output only. It scopes and sequences the work into small
tasks for the **architecture** stage to accept/revise/reject; it does not itself decide
ACCEPT/REVISE/REJECT and no source files are modified in this stage.

---

## Grounding: verified current repo state (not just the draft doc)

- The draft's own header says its 10 files are "unstaged in working tree," but `git log`
  shows that is **stale**: the orchestrator work is already committed —
  `5bc34d9` (feat: Runtime Orchestrator), `23d5ac5` (shell/base64 fix),
  `907db33` (PVE_SSH_KEY fix). The "unapproved draft" is live code in history, not a
  pending patch. This is the central fact the architecture stage must react to.
- On top of that committed code, the working tree has a **second, separate, still-uncommitted**
  change set touching `ports.js`, `runner.js`, `runtimeOrchestrator.js`,
  `environmentService.js`, `projectService.js`, `docker-compose.yml`, `Environments.jsx`,
  `Overview.jsx`. This matches components D1-D6 of the prior
  `Docs/ARCHITECTURE_DECISION_RUNTIME_LOCATION_AND_CONTEXTOS_TRACE.md` (the runtime-location
  resolver work from a different, earlier-approved workflow) — e.g. `ports.js` now imports
  `resolveRuntimeHost()` from `runtimeLocation.js` and `runtimeOrchestrator.js`'s
  `getNextVmid()` has been rewritten to shell out to `pvesh get /cluster/nextid` over SSH.
  Two workflows' code are now interleaved in the same files, uncommitted. The architecture
  stage must treat both the committed draft *and* this uncommitted layer as in scope for
  review — reviewing only the frozen `.md` snapshot would miss real, currently-running code.

## Goals

1. Give the architecture stage a small, orderable set of tasks instead of one large
   "full deployment pipeline" blob, so ACCEPT/REVISE/REJECT can be decided per-component.
2. Preserve everything already proven to work (LXC 200: privileged, nesting=1,
   apparmor:unconfined, proc:mixed, vfs Docker storage driver, `sandbox-nginx` → HTTP 200)
   as the reference config for any per-project LXC task — no re-deriving it.
3. Surface the governance gap explicitly (code merged without Architect sign-off) as an
   architecture-stage input, not something planning silently absorbs or corrects.
4. Flag every known-broken or known-risky item from the draft's own "What Is Broken" /
   "Known Blockers" tables as a discrete task or an open question, so none are silently
   carried forward unresolved.

## Task List (small, independently reviewable)

- **T1 — Vmid allocation.** `getNextVmid()` in `runtimeOrchestrator.js` now shells out to
  `pvesh get /cluster/nextid` over SSH with a DB fallback. Task: confirm this replaces the
  old `MAX(lxc_vmid)+1` race-prone query everywhere it's called; no other caller still
  computes vmid independently.
- **T2 — SSH key sourcing.** Already fixed (`907db33`) to read `PVE_SSH_KEY` from env
  instead of a hardcoded host path. Task: verify `docker-compose.yml` actually mounts/sets
  it for every service that calls into `runtimeOrchestrator.js`, not just the one that was
  tested.
- **T3 — Shell compatibility.** Already fixed (`23d5ac5`) for Alpine `/bin/sh` +
  base64 config transfer. Task: add one regression check that pipeline steps run
  unmodified against the Alpine-based container image used in CI/dev.
- **T4 — LXC provisioning step.** Reuse the proven LXC 200 config verbatim (privileged,
  `features: nesting=1`, `lxc.cgroup2.devices.allow: c:*:* rwm`, `lxc.cap.drop:` empty,
  `lxc.apparmor.profile: unconfined`, `lxc.mount.auto: proc:mixed sys:ro cgroup:mixed`) as
  a named constant/template, not re-typed per call site.
- **T5 — Docker-in-LXC install step.** `apt-get install docker.io` + force `vfs` storage
  driver (fuse-overlayfs is blocked in this LXC config) — keep as its own pipeline step
  with its own timeout, distinct from LXC creation.
- **T6 — Container deploy step.** `docker run` with `goneops.*` labels + health check,
  matching the already-proven `sandbox-nginx` deployment shape.
- **T7 — Runtime schema.** `runtime_instances` (project_id, environment_id, vmid,
  ip_address, preview_url) and `runtime_jobs` (project_id, environment_id, current_step,
  status, logs) — confirm these live in `inventorySchema.js`/`ensureInventorySchema()`
  (the actual schema bootstrap per prior workflow findings) and not only in
  `database/init.sql`, so they're created on a fresh container start.
- **T8 — Run/jobs API.** `POST /projects/:id/environments/:envId/run` (kicks the
  pipeline) and `GET /projects/:id/environments/:envId/jobs` (polling) — confirm route
  boundaries stay inside `routes/projects.js` and don't leak orchestrator-specific logic
  into `routes/inventory.js`.
- **T9 — `POST /api/platform/applications` fix.** Draft lists a "query import bug fixed"
  here; task is to confirm this fix is unrelated cleanup bundled into the same commit and
  scope it out of the orchestrator review if so (mixed-concern commit).
- **T10 — Runtime-health endpoint.** `GET /api/platform/runtime-health` (label-based
  Docker matching). Task: confirm which host this queries post-D1/D5 (PVE host via
  `remoteExec.js`, not in-LXC) so it doesn't drift from `runtimeLocation.js` as the single
  host source of truth.
- **T11 — Frontend job polling.** Run button + 3s poll + step icons
  (Loader2/CheckCircle2/AlertCircle) in `Environments.jsx` — confirm it consumes T8's job
  status shape only, no direct DB/SSH assumptions in the frontend.
- **T12 — IP allocation.** `getNextIp()` generates a `192.168.1.18x` address with **no
  pool validation or collision check** — open question for architecture, not a fix
  assumed here.
- **T13 — Failure/rollback path.** No task in the draft addresses what happens to a
  partially-created LXC (e.g. created but Docker install fails) — needs an explicit
  cleanup/retry decision before this is considered done.
- **T14 — Audit logging.** Draft has no audit_logs entries for run/deploy actions; this
  is required by the Reviewer-stage gate later, so plan it as its own small task now
  rather than retrofitting it after code review fails.
- **T15 — `execSync` usage.** Pipeline runs blocking `execSync` calls (SSH out to the PVE
  host for vmid, LXC create, Docker install) inside a `setImmediate`-deferred async
  function — flag for architecture: is blocking-the-event-loop for the duration of
  provisioning acceptable at current scale, or does this need a worker/child process?
- **T16 — Reconcile the uncommitted runtime-location layer.** Tasks T1/T7/T8/T11 above
  now overlap with the uncommitted `ports.js`/`environmentService.js`/`Overview.jsx`
  changes from the separate runtime-location workflow. Architecture stage must decide:
  land both change sets together, or sequence one after the other, so they aren't
  reviewed and tested as if they were independent.

## Risks

- The orchestrator code was already committed (`5bc34d9`, `23d5ac5`, `907db33`) without
  Architect approval — this workflow is a retroactive review of live code, not a
  pre-merge review of a patch; a REVISE/REJECT decision at the architecture stage means
  reverting or amending already-shipped commits, which is a bigger operation than
  reviewing an unstaged diff.
- A second, uncommitted change set (runtime-location resolver work) already touches four
  of the same files the draft touches; reviewing/testing them separately risks passing
  each in isolation while the merged result is broken.
- `getNextIp()` has no IP pool validation — collision risk across concurrent
  environments is unresolved and not covered by any task above except as an open question.
- No rollback path exists for a pipeline failing partway (LXC created, Docker install
  failed) — risk of orphaned LXCs accumulating on the PVE host with no cleanup job.
- No audit logging in the draft for run/deploy actions — will fail the Reviewer stage's
  "audit logging" gate as currently written unless addressed as its own task (T14).
- `execSync` blocking calls run inside the Node process for the duration of LXC
  create + Docker install (potentially minutes) — event-loop blocking risk under
  concurrent runs.
- Shelling out to `ssh ... 'pvesh get ...'` via `execSync` with `shell: true` builds a
  command string from `PVE_SSH_KEY`/host constants, not end-user input — low injection
  risk today, but worth a reviewer-stage note if any of those become request-derived later.
- 192.168.1.165 (PVE host) reachability from the sandbox/CI environment used in later
  testing/QA stages is a known limitation from prior workflows; the Tester phase's "curl
  HTTP 200" gate may only be verifiable from a LAN-connected environment.
- LXC config used (privileged, apparmor unconfined, nesting=1) has a materially larger
  blast radius than an unprivileged container; accepted only because it's the proven
  config for Docker-in-LXC on this host — any deviation from the exact proven config
  should be treated as a new risk, not a minor tweak.
