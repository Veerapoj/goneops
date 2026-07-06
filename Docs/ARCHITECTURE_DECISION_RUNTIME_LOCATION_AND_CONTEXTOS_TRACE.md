# Architecture Decision — Runtime Location Fix & ContextOS Trace Observability

Workflow: `wf-20260706-goneops-runtime` · Stage: `architecture` · Model: opus
Context: `ctx_01KWTW9M9BNQXW631SJVRFXFWT`

This document is the `architecture_decision` output that governs the `implementation`
stage. It does **not** claim the fixes are done; the final
`Docs/GONEOPS_RUNTIME_LOCATION_AND_CONTEXTOS_TRACE_REPORT.md` is produced later, after
implementation is verified.

---

## Grounding: current live state (verified this stage)

- **Goal 1 core already landed** in commit `c20e122`:
  - `backend/src/sandbox/runtimeLocation.js` exists and is the single resolver
    (`resolveRuntimeHost()` → `PVE_SSH_HOST || 192.168.1.165`; `buildPreviewUrl(port)` →
    `http://<host>:<port>` or `null` when port missing).
  - `runner.js` `runSandbox` (L110) and `restartSandbox` (L196) now build `previewUrl`
    via `buildPreviewUrl(port)`.
  - `generator.js` (L96) writes the initial `preview_url` via `resolveRuntimeHost()`.
  - `grep` confirms **`PUBLIC_HOST` no longer appears in any backend code** — only
    `docker-compose.yml:36` still defines it.
- **Still open** against the task/plan:
  - **M4** `sandbox/ports.js` is pure port bookkeeping with no host/URL concept.
  - **M6** No `runtime_location` field is exposed on the environment API response.
  - **M7** `Overview.jsx` / `Environments.jsx` render only `preview_url`, not
    provider/host/container.
  - **Latent bug** `runner.js` calls `pctExec` (L188-189, L226), `bootstrapLxc` (L48) and
    `getLxcIp` (L49) but **never imports/defines them** → `ReferenceError` whenever the
    `restartSandbox` or `ensureLxcReady` LXC path executes. `runSandbox` already uses the
    correct PVE-host `dockerRun` path from `remoteExec.js`.
  - **Goal 2** target files (`contextos_flow.py`, the `contextos-flow` CLI, progress-file
    helpers) live under `/home/veenews/ContextOS`, **outside** the declared workspace
    `/home/veenews/GoneOps`.

---

## Decisions

### D1 — `runtimeLocation.js` is the sole runtime-host source of truth
Keep the committed module as the single authority. Any code that needs "where Docker
actually runs" imports `resolveRuntimeHost()` / `buildPreviewUrl()`; no other file
reconstructs a host string. `PUBLIC_HOST` is banned from runtime URL construction.
`docker-compose.yml:36` `PUBLIC_HOST` is now dead for URL purposes — implementation must
re-`grep` before deletion and remove it only if no unrelated consumer exists.

### D2 — `ports.js` gains a host-aware read path (M4)
`allocatePorts()` stays a pure allocator. Add a runtime-resolver-backed read helper so
consumers never hand-build URLs:
`getPorts(environmentId)` returns each row enriched with `host` (from
`resolveRuntimeHost()`) and `url` (from `buildPreviewUrl(host_port)`). `ports.js` imports
`runtimeLocation.js` — this is the "dynamic runtime resolver" the task names.

### D3 — API exposes a structured `runtime_location` object (M6)
Extend the environment response with:
```
runtime_location: { provider: "proxmox", host: "<resolveRuntimeHost()>",
                    container: "<projectName>-<serviceName>" }
```
`host` from `runtimeLocation.js`; `container` from the existing
`${projectName}-${svc.name}` naming convention (same string `runSandbox` deploys and that
carries the `goneops.*` labels). Frontend consumes this object directly instead of parsing
the `preview_url` string.

### D4 — Frontend shows real runtime location (M7)
`Overview.jsx` (near the preview link, L169-213) and `Environments.jsx` (L95-100) render
`runtime_location.provider / host / container` beside the existing clickable
`preview_url`. Pure additive/read-only display; no behavioral change.

### D5 — Repair the broken restart/LXC path (risk from plan)
A `preview_url` string fix does not repair restart while `pctExec`/`bootstrapLxc`/
`getLxcIp` are undefined. Per `Docs/GONEOPS_RUNTIME_EXECUTION_FIX_REPORT.md`, LXC-internal
Docker is abandoned in favor of direct PVE-host execution. Implementation must route
`restartSandbox` through the same `remoteExec.js` `dockerRm`+`dockerRun` PVE-host path as
`runSandbox` (and drop/replace the dead `pctExec` calls), so both paths are consistent and
runnable. This is required, not optional — otherwise restart throws at runtime.

### D6 — Goal 2 is deferred as an explicit scope boundary
Goal 2's implementation targets are entirely outside the workspace. The governing rule is
"Work only inside the workspace." Therefore this workflow **must not** modify
`/home/veenews/ContextOS`. Decision: Goal 2 is split out to a **ContextOS-scoped
workflow**. This workflow delivers only the *design* for it (D7) plus documentation.

### D7 — ContextOS trace storage: extend the progress-file JSON, no new table (M13)
No `workflow_events` table or any DB exists in ContextOS's storage layer today (only the
per-run progress JSON + stage-completion markers). Decision: **do not** introduce a DB
table. Extend the existing per-run progress JSON with an append-only `events` array; each
transition appends
`{stage, role, actor_id, model, tool, start_time, end_time, status, artifact_ref}`.
`execute_stage()`/`run_agent()` already hold `stage_id`, `model`, `actor_id` at every
transition point. `contextos-flow status` reads that array to print
`current_role, agent_name, model, stage, progress (X/Y over the workflow's stage count),
elapsed` (reusing `elapsed_seconds`), plus a chronological agent-timeline view. To be
implemented under the ContextOS-scoped workflow, not here.

---

## Components (to implement next stage)
1. `backend/src/sandbox/runtimeLocation.js` — resolver (exists; source of truth).
2. `backend/src/sandbox/ports.js` — host/url-enriched `getPorts` (D2).
3. `backend/src/services/environmentService.js` + environment route — `runtime_location`
   object on the response (D3).
4. `backend/src/sandbox/runner.js` — route `restartSandbox` through PVE-host `remoteExec`
   path; remove undefined `pctExec`/`bootstrapLxc`/`getLxcIp` usage (D5).
5. `frontend/src/pages/Overview.jsx`, `frontend/src/pages/Environments.jsx` — render
   `runtime_location` (D4).
6. `docker-compose.yml` — re-verify then remove dead `PUBLIC_HOST` (D1).
7. ContextOS progress-file `events` array + `status`/timeline view — **separate
   ContextOS-scoped workflow** (D6/D7).

## Constraints
- Work only inside `/home/veenews/GoneOps`; ContextOS files are read-only and out of scope
  for modification here (D6).
- No new DB table for ContextOS trace; extend the existing progress JSON (D7).
- `preview_url` must equal `http://192.168.1.165:<port>` on both run and restart paths;
  host comes only from `runtimeLocation.js` (D1, D5).
- Live Goal-1 verification needs LAN reachability to `192.168.1.165` and a working
  `PVE_SSH_KEY`; if unreachable, report as a connectivity limitation, not a pass/fail.
- No ContextOS drafts/approvals created by this workflow; the orchestrator persists results.
