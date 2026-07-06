# Runtime Orchestrator — Architect Review (Architecture Stage)

Workflow: `ctx_01KWV6WAJATQ86AHJHJ76RM45D` · Stage: `architecture`
Inputs reviewed:
- `Docs/UNAPPROVED_RUNTIME_ORCHESTRATOR_DRAFT.md` (frozen draft)
- `Docs/RUNTIME_ORCHESTRATOR_TASK_PLAN.md` (planning-stage task list T1–T16)
- Live code: `backend/src/sandbox/runtimeOrchestrator.js`, `backend/src/routes/projects.js`,
  `backend/src/services/inventorySchema.js`, `backend/src/lib/audit.js`

This is a **retroactive** review: the orchestrator is already committed (`5bc34d9`,
`23d5ac5`, `907db33`), not a pending patch. A second, uncommitted runtime-location layer
(`ports.js`, `environmentService.js`, `runner.js`, `Overview.jsx`, `docker-compose.yml`,
`Environments.jsx`) overlaps the same files. Both are in scope.

---

## Decision: REVISE (Conditional ACCEPT)

The overall approach is **accepted**: an async job-tracked pipeline that provisions one
per-project LXC on the PVE host over SSH, installs Docker (vfs driver), and runs the
project's services as labelled containers, using the **proven LXC 200 config** (privileged,
`nesting=1`, `apparmor:unconfined`, `proc:mixed`, vfs driver — HTTP 200 verified). That
config is ratified as the reference template and MUST NOT be re-derived or tweaked.

Implementation may proceed **only** on the tasks accepted below, and **only** after the
three MUST-FIX items are folded into the task plan. Two of the MUST-FIX items are not merely
polish — as written the pipeline cannot satisfy the QA "curl HTTP 200" gate and exposes a
shell-injection surface that will fail the Reviewer gate.

---

## MUST-FIX (blocking — required before implementation/review/QA can pass)

### MF1 — preview_url uses a fabricated IP, not the LXC's real address (folds T12)
`runtimeOrchestrator.js` creates the LXC with `--net0 name=eth0,bridge=vmbr0,ip=dhcp`
(DHCP), but `getNextIp()` fabricates `192.168.1.${180 + COUNT(*)}` and `preview_url` is
built from that fabricated value. The fabricated address has **no relationship** to the
DHCP lease the LXC actually receives, so `curl <preview_url>` will hit the wrong host (or
nothing). This directly breaks the Phase 5/6 "curl returns 200" gate.
**Fix:** after `pct start` + settle, read the real IP from the container
(`pct exec <vmid> -- hostname -I` / lease) and build `preview_url` from that. `getNextIp()`
and its `COUNT(*)`-based scheme are removed or reduced to a static-IP allocator only if the
LXC is switched to a validated static-pool address (which then also needs collision checks).
This supersedes planning task **T12** — the IP question is decided here, not left open.

### MF2 — no rollback/cleanup of a partially-created LXC (T13)
On any failure the `catch` sets `environments.status='failed'` but leaves the LXC created by
`pct create`/`pct start` orphaned on the PVE host, and writes **no failure audit row** from
inside the orchestrator (only the route's synchronous 202 path is audited). Repeated failed
runs accumulate orphaned LXCs.
**Fix:** on pipeline failure, `pct stop`/`pct destroy` the vmid created in this run (only if
this run created it), mark `runtime_jobs`/`runtime_instances` accordingly, and
`writeAuditLog({ action:'sandbox_deploy', result:'failure', resource_id:vmid, ... })`.

### MF3 — shell-injection / robustness in the container-deploy step
The deploy loop interpolates **unsanitized** `project.name`, `env.name`, `svc.name`, and
`svc.config.image` into a double-quoted `ssh '... pct exec <vmid> -- bash -c "docker run
... -l goneops.project=${project.name} ... ${image}"'` string. `safeName` is sanitized but
the label values and image are not, and the whole command is a nested triple-shell string
(local `sh -c` → remote `bash -c` → `docker run`). A project/service name or image
containing quotes, `$`, backticks, or `;` breaks or injects the command.
**Fix (Reviewer-gate requirement):** pass these as an argv array (avoid `shell:true` string
building) or strictly validate/escape every interpolated value; reuse `safeName`-style
sanitization for label values and validate `image` against an allowlist/regex.

---

## ACCEPTED tasks (implement as planned)

- **T1 Vmid allocation — ACCEPT.** `getNextVmid()` uses `pvesh get /cluster/nextid` over SSH
  with a DB fallback; confirm no other caller still computes vmid independently.
- **T2 SSH key sourcing — ACCEPT.** `PVE_SSH_KEY` read from env (`907db33`); verify
  `docker-compose.yml` sets/mounts it for every service that reaches the orchestrator.
- **T3 Shell compatibility — ACCEPT.** Alpine `/bin/sh` + base64 config transfer (`23d5ac5`);
  add the single Alpine-image regression check.
- **T4 LXC provisioning — ACCEPT (frozen config).** Extract the proven LXC 200 config into a
  single named constant/template; **no deviation** from the exact proven values.
- **T5 Docker-in-LXC install — ACCEPT.** `apt-get install docker.io` + forced `vfs` driver as
  its own step with its own timeout.
- **T6 Container deploy — ACCEPT, gated by MF3.** `docker run` + `goneops.*` labels + health
  check, matching `sandbox-nginx`; must land with MF3's argv/escaping fix.
- **T7 Runtime schema — ACCEPT (verified).** `runtime_instances` (with `UNIQUE(project_id,
  environment_id)` backing the upsert) and `runtime_jobs` are present in
  `inventorySchema.js`/`ensureInventorySchema()`. Confirmed.
- **T8 Run/jobs API — ACCEPT (verified).** `POST .../run` and `GET .../jobs` live in
  `routes/projects.js`, guarded by `requireRole('operator')`, no orchestrator logic leaked
  into `routes/inventory.js`. Confirmed — no boundary violation.
- **T10 Runtime-health endpoint — ACCEPT.** Confirm it resolves the host via
  `runtimeLocation.js` (single source of truth), not a second hardcoded host.
- **T11 Frontend job polling — ACCEPT.** `Environments.jsx` consumes only the T8 job shape;
  no direct DB/SSH assumptions in the frontend.
- **T14 Audit logging — ACCEPT, extended.** Run endpoint + deploy-success are audited; MF2
  adds the missing failure-path audit row from inside the orchestrator. With that, the
  Reviewer audit gate is satisfied.

## ACCEPTED WITH CONSTRAINT

- **T15 execSync blocking — ACCEPT for current single-user lab scale only.** Blocking
  `execSync` inside `setImmediate` blocks the event loop for the minutes-long provision.
  Acceptable now because concurrency is effectively one; recorded as tech debt with a
  hard constraint: **must move to a child-process/worker before any multi-tenant or
  concurrent-run use.** No new concurrent-run entry points may be added meanwhile.

## SCOPED OUT

- **T9 `POST /api/platform/applications` query-import fix — OUT OF SCOPE.** Unrelated cleanup
  bundled into the same commit; not part of the runtime-orchestrator review. Leave as-is.

## SEQUENCING

- **T16 Reconcile runtime-location layer — REQUIRED.** The committed orchestrator and the
  uncommitted runtime-location layer touch four of the same files. They MUST be landed and
  tested **together as one merged result**, not reviewed/tested in isolation, or the merged
  behavior (host resolution, port mapping) can pass each half yet break combined.

---

## Constraints carried into downstream stages

1. LXC config is frozen to the proven LXC 200 values — any deviation is a new risk, not a tweak.
2. `preview_url` must be derived from the LXC's real (DHCP) IP (MF1).
3. Every failure path must clean up the LXC it created and write a failure audit row (MF2).
4. No unsanitized user-derived value may reach a shell/`docker run` string (MF3).
5. Run/jobs routes stay in `routes/projects.js` behind `requireRole('operator')`.
6. Runtime schema stays in `inventorySchema.js` (created on fresh container start).
7. No new concurrent-run entry point until execSync is off the event loop (T15).
8. Orchestrator + runtime-location layer land together (T16).
9. PVE host `192.168.1.165` reachability is required for the Tester/QA curl gate; if the
   test environment cannot reach the LAN, QA must run from a LAN-connected host.

## on_fail routing
If implementation/review/testing/QA fails, the workflow returns to `architecture` per the
authoritative graph. The three MUST-FIX items are the most likely failure sources and are
called out here so a downstream failure maps back to a specific fix, not a re-review.

---

## Re-entry addendum (2026-07-06) — re-review after downstream on_fail

Implementation landed and MF1–MF3 are **verified present** in
`backend/src/sandbox/runtimeOrchestrator.js`:
- MF1: `getLxcDhcpIp()` (lines 40–54) reads the real IP; `previewUrl` is built from it (137–138).
- MF2: the failure `catch` runs `pct stop`/`pct destroy` on the run's own `createdVmid` and
  writes a `result:'failure'` audit row (149–170).
- MF3: `safeLabel()`/`safeImage()` sanitize every interpolated label and validate the image,
  throwing on an invalid image (16–26, 124–130). `PROVEN_LXC_CONFIG_EXTRA` is a frozen
  constant (T4, lines 9–14).

The three original MUST-FIX items are **closed**. However, re-reviewing the deploy path
specifically against the QA `curl HTTP 200` gate — the gate that routes a failure back here —
surfaces two residual design gaps that MF1 did not fully close. These are the two most likely
causes of a Tester/QA failure and are now **blocking**:

### MF4 — a missing DHCP IP must fail the deploy, not silently "succeed" with 0.0.0.0 (blocking)
When `getLxcDhcpIp()` returns `null` (DHCP not yet settled after the fixed 15 s wait, or
networking not up inside a freshly-booted Ubuntu LXC), the pipeline logs a warning but still
proceeds, sets `effectiveIp = '0.0.0.0'`, builds `preview_url = http://0.0.0.0:<port>`, and
marks the job `Ready`/`success` and the instance `running`. That state is **unpassable** at
QA: `curl http://0.0.0.0:<port>` cannot return 200 from another host. A run that cannot
produce a reachable `preview_url` must be treated as a failure (triggering MF2 cleanup), not
a success. **Fix:** replace the fixed 15 s sleep with a bounded retry/poll loop for the IP
(e.g. up to ~60–90 s), and if no valid IP is obtained, `throw` so the failure/rollback path
runs — never persist `status='running'` with a `0.0.0.0` preview_url.

### MF5 — published port must target the image's real internal listen port (blocking)
The deploy step runs `docker run ... -p ${svcPort}:${svcPort} ${image}` and builds
`preview_url` from the same `svcPort`. This only returns 200 if the image actually listens on
`svcPort` **inside** the container. The proven LXC 200 reference worked because its nginx was
explicitly configured to listen on 8080; a default `nginx:alpine` listens on **80**, so
`-p 8080:8080` yields an open host port with no server behind it and `curl` fails. **Fix:**
map the published host port to the image's actual container port
(`-p <hostPort>:<containerPort>`), sourcing `containerPort` from the service config (default
to the image's known port, e.g. 80 for nginx) and build `preview_url` from `<hostPort>`.
This keeps the deploy consistent with the proven-config intent (a reachable HTTP endpoint)
rather than an assumption that host and container ports are always equal.

### Decision on re-entry
**REVISE (Conditional ACCEPT), unchanged in spirit.** The architecture and the frozen LXC 200
config remain ratified; MF1–MF3 are satisfied. Implementation may return to the Developer
stage to fold in **MF4** and **MF5** only — no re-architecture of the pipeline is warranted.
Both are localized changes to the IP-acquisition and container-deploy steps of
`runtimeOrchestrator.js` and both map directly to the QA curl-200 gate.

---

## Re-entry addendum #2 (2026-07-06) — re-review after downstream on_fail

**MF4 and MF5 are verified satisfied** in `backend/src/sandbox/runtimeOrchestrator.js`:
- MF4: `Acquiring IP address` step (lines 102–108) runs a bounded 5-attempt retry with 5 s
  gaps and `throw`s `Could not determine LXC DHCP IP after 5 retries` on `null`, feeding the
  MF2 rollback catch. The old `0.0.0.0` success fallback is gone from the happy path.
- MF5: the deploy loop (lines 124–134) maps `-p ${hostPort}:${containerPort}` with
  `containerPort = svc.config?.containerPort || 80` and `hostPort = svc.port || 8080`;
  `preview_url` is built from `webPort` = the first service's `hostPort` (lines 134, 140).

MF1–MF5 are therefore all **closed**. Boundary/schema items re-verified current: run/jobs
routes remain in `routes/projects.js` behind `requireRole('operator')` with no leak into
`routes/inventory.js`; `runtime_instances`/`runtime_jobs` remain in `inventorySchema.js`
with `UNIQUE (project_id, environment_id)` backing the upsert.

### MF6 — the accepted T6 health check is stubbed; a non-serving deploy is marked success (blocking)
T6 was accepted on the condition that the deploy include a health check "matching the proven
`sandbox-nginx` shape." As implemented, the `Checking health` step (lines 137–138) is a bare
`setTimeout(5000)` — it never verifies the container is running or that anything answers on
the published port. `docker run` (line 133) is fire-and-forget: an image-pull failure, a
crashed container, or a container listening on a port other than the assumed
`containerPort` all leave the pipeline marking the job `Ready`/`success` and the instance
`running` with a `preview_url` that returns no 200. That false-success is exactly the state
that fails the Phase 5/6 `curl HTTP 200` gate and routes the workflow back to this stage.
**Fix (Developer, localized to the `Checking health` step only):** after the deploy loop,
verify from *inside* the LXC that the endpoint actually serves — e.g.
`pct exec <vmid> -- curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:<webPort>` in
a short bounded retry (a few attempts over ~15–30 s), and if it never returns a 2xx/3xx,
`throw` so the MF2 cleanup/rollback + failure-audit path runs instead of persisting a
`running` instance. This turns the QA gate into something the pipeline enforces on itself
rather than discovering only at QA. It is **not** a re-architecture: no pipeline steps are
added or reordered; the existing sleep is replaced with a real check.

### Decision on re-entry #2
**REVISE (Conditional ACCEPT).** The architecture, the frozen LXC 200 config, and MF1–MF5
all stand. **MF6 is the sole remaining blocking item.** Return to the Developer stage to fold
in MF6 only — an in-LXC HTTP health check that fails the deploy (into the existing MF2
rollback) when the service does not answer. With MF6 folded in, no further architecture
change is anticipated: the pipeline will then enforce the same curl-200 condition that QA
verifies, so a real environment/network failure (not a code gap) is the only remaining way
for Testing/QA to fail, and the standing PVE-reachability constraint (§9) governs that.

---

## Re-entry Addendum #3 — MF6 verified closed; full ACCEPT

Re-reviewed live `backend/src/sandbox/runtimeOrchestrator.js` after the Developer folded in
MF6. **MF6 is satisfied:** the `Checking health` step (lines 137–146) replaces the old
no-op `setTimeout` with an in-LXC verification loop — `pct exec <vmid> -- ... curl ...
http://127.0.0.1:${webPort}` parsing `%{http_code}`, up to 5 attempts with 3 s gaps, and it
`throw`s `Health check failed: HTTP 200 not returned ...` on failure, which feeds the
existing MF2 rollback (`pct stop`/`pct destroy` + failure audit row). No pipeline step was
added or reordered.

**All of MF1–MF6 are now closed** and re-verified against the current tree:
- MF1 preview_url from real DHCP IP (`getLxcDhcpIp`, line 148).
- MF2 failure catch destroys this run's `createdVmid` and writes a `result:failure` audit row (163–180).
- MF3 `safeLabel`/`safeImage` sanitize labels and validate/throw on image (16–26, 126–133).
- MF4 bounded DHCP-IP retry throws on null into rollback; no `0.0.0.0` success path (104–108).
- MF5 `-p hostPort:containerPort` (containerPort default 80), preview_url from hostPort (127–148).
- MF6 in-LXC HTTP-200 health check throws into rollback on failure (137–146).

Boundaries/schema re-verified current: run/jobs routes remain in `routes/projects.js` behind
`requireRole('operator')` with no leak into `routes/inventory.js`; `runtime_instances`/
`runtime_jobs` remain in `inventorySchema.js` with `UNIQUE (project_id, environment_id)`
backing the orchestrator's `ON CONFLICT` upsert.

### Decision on re-entry #3
**ACCEPT.** No remaining blocking MUST-FIX items. The pipeline now self-enforces the same
`curl HTTP 200` condition the Phase 5/6 gate verifies, so a non-serving deploy fails closed
(rollback) rather than persisting a false-success `running` instance. Architecture is not
re-opened; downstream stages (Review → Testing → QA) may proceed.

**Non-blocking notes carried to Reviewer/Tester (not architecture blockers):**
1. Verify the MF6 health command's `%{http_code}` format string survives the nested
   SSH single-quote → `bash -c` double-quote → `curl` quoting and actually yields the literal
   string `200` against a known-good container. This path fails *closed* (a mangled format
   → never `=== '200'` → rollback), so it cannot cause false success, but a quoting defect
   would make even a healthy deploy roll back — confirm against LXC 200's proven nginx.
2. T15 stands: `execSync` blocking calls remain accepted for single-user lab scale only; no
   new concurrent-run entry point.
3. §9 standing constraint governs the only remaining failure mode: PVE host 192.168.1.165
   must be reachable from the Tester/QA host for the curl-200 gate; run QA from a
   LAN-connected host if CI cannot reach the LAN.

---

## Re-entry Addendum #4 (2026-07-06) — post-implementation failure-path fix verified; ACCEPT stands

Re-review after a downstream `on_fail` returned to architecture. The Developer stage folded
in a genuine defect fix (not a re-architecture): the failure-path `INSERT INTO
runtime_instances` previously listed **6 target columns against 5 bound values**, silently
misaligning the row on every failed deploy (writing the literal `'failed'` into
`runtime_name` and a fabricated `'0.0.0.0'` into `ip_address`). Re-verified against the
current tree:

- **Fix confirmed** (`runtimeOrchestrator.js` lines 182–185): the failure INSERT now sets only
  `project_id, environment_id, vmid, status='failed'` (4 columns / 4 values) with
  `ON CONFLICT (project_id, environment_id) DO UPDATE SET status='failed', vmid=$3`.
  `runtime_name`/`ip_address`/`preview_url` are left untouched on failure rather than
  corrupted. `runtime_instances.vmid` is `INTEGER` (nullable, schema line 322), so a failure
  before `getNextVmid()` (i.e. `createdVmid === null`) inserts a NULL vmid without violating a
  constraint — no NOT NULL / type fault on the early-failure path.

- **MF1–MF6 re-verified present and unchanged** in the current file: MF1 preview_url from real
  DHCP IP (`getLxcDhcpIp`, line 148); MF2 catch runs `pct stop`/`pct destroy` on this run's
  `createdVmid` + `result:'failure'` audit row (163–180); MF3 `safeLabel`/`safeImage`
  sanitize/validate before `docker run` (16–26, 126–133); MF4 bounded 5-retry DHCP-IP with
  `throw` on null into rollback, no `0.0.0.0` success (104–108); MF5 `-p hostPort:containerPort`
  (containerPort default 80) with preview_url from `hostPort` (127–148); MF6 in-LXC
  `curl … %{http_code}` HTTP-200 bounded 5-retry that throws `Health check failed` into the
  MF2 rollback (137–146).

- **Boundaries/schema re-verified current:** `POST …/environments/:envId/run` and
  `GET …/environments/:envId/jobs` remain in `routes/projects.js`; the mutating `run` route is
  behind `requireRole('operator')` (line 82) with no orchestrator logic leaked into
  `routes/inventory.js`. `runtime_instances` carries `UNIQUE (project_id, environment_id)`
  (schema line 329) backing the `ON CONFLICT` upsert; `runtime_jobs` present. `node --check`
  and a `require()` smoke test of the module (`exports: deploySandbox, getNextVmid`) pass.

### Decision on re-entry #4
**ACCEPT.** The failure-path column/value misalignment is corrected; MF1–MF6, boundaries, and
the frozen LXC 200 config all stand. No remaining blocking MUST-FIX and no architecture change
is warranted — the pipeline still fails closed (rollback + failure audit) on any provisioning,
IP, deploy, or health error, and only writes a `status='running'` instance after a real in-LXC
HTTP-200. Downstream Review → Testing → QA may proceed. The single remaining failure mode is
environmental, governed by the standing §9 constraint: PVE host 192.168.1.165 must be reachable
from the Tester/QA host for the curl-200 gate; run QA from a LAN-connected host if CI cannot
reach the LAN. Architecture is not re-opened.

---

## Re-entry Addendum #5 (2026-07-06) — downstream failure root-caused to a missing PVE SSH credential (environmental, not code)

Re-review after another downstream `on_fail` returned to architecture. Re-verified the code is
unchanged and still correct: `node --check` passes; MF1–MF6 remain present in
`runtimeOrchestrator.js`; run/jobs routes remain in `routes/projects.js` with the mutating
`run` route behind `requireRole('operator')` (line 82) and no leak into `routes/inventory.js`;
`runtime_instances` carries `UNIQUE (project_id, environment_id)` (schema line 329) and
`runtime_jobs` is present. There is **no code defect** driving this failure.

**Root cause of the repeating downstream failure — diagnosed:** the orchestrator's SSH auth to
the PVE host cannot succeed because the configured private key does not exist as a key file.
- `docker-compose.yml` sets `PVE_SSH_KEY=/ssh-key/id_ed25519_pve` and bind-mounts
  `- /home/veenews/.ssh/id_ed25519_pve:/ssh-key/id_ed25519_pve:ro` (lines 39, 43).
- On the host, `/home/veenews/.ssh/id_ed25519_pve` is an **empty directory owned by root**, not a
  private key. This is the classic Docker footgun: the bind-mount *source* did not exist as a
  file when the container first started, so Docker created it as a directory. Inside the
  container the mount target is therefore also a directory, and every `ssh -i <dir>` call fails
  with `Load key "...": Is a directory` → `Permission denied (publickey,password)`.
- The PVE host **is network-reachable**: both direct probes (`id_ed25519`, `id_ed25519_goneops`)
  connected and reached the SSH auth stage, returning `Permission denied (publickey,password)`
  rather than a connection timeout. So the standing §9 "LAN reachability" note is **not** the
  active blocker this time — reachability is fine; the credential is missing.
- Neither key currently present on the host (`id_ed25519`, `id_ed25519_goneops`) is authorized on
  `root@192.168.1.165`. There is no available key material that authenticates.

**Consequence:** with no authorized PVE key, the orchestrator cannot `pct create` the LXC, so the
pipeline fails at "Creating LXC", the MF2 rollback/failure-audit path runs correctly, and the
Testing/QA `curl HTTP 200` gate is unreachable. This is an environment/credentials provisioning
gap, **not** an architecture or code defect, and it cannot be fixed from the workspace because the
authorized private key is not available to me to install.

### Required remediation (ops/environment — outside code, blocks Testing/QA)
1. Generate or locate the PVE-authorized ed25519 private key and place the **file** at
   `/home/veenews/.ssh/id_ed25519_pve` (mode 600). First remove the empty directory Docker
   created at that path, or Docker will keep mounting a directory.
2. Ensure the corresponding public key is in `root@192.168.1.165:~/.ssh/authorized_keys`.
3. Recreate the backend container so the corrected file is bind-mounted (a running container keeps
   the old directory mount).
4. Verify from the host: `ssh -i /home/veenews/.ssh/id_ed25519_pve root@192.168.1.165 'pvesh get /cluster/nextid'`
   returns a vmid before re-running Testing/QA.

### Recommended (non-blocking) code hardening — Developer stage, optional
Fail fast with a clear diagnostic when `PVE_SSH_KEY` is absent or is not a regular file, so the
job log shows "PVE SSH key missing/not a file" at the first step instead of an opaque SSH auth
error buried mid-pipeline. This is robustness only; it does not change the pipeline architecture
and does not, by itself, make Testing/QA pass.

### Decision on re-entry #5
**ACCEPT.** The pipeline architecture, the frozen LXC 200 config, MF1–MF6, boundaries, and schema
all stand — no architecture change is warranted and none would resolve this failure. The sole
active blocker is the missing authorized PVE SSH credential at the bind-mount source, which is an
environment/ops fix (steps 1–4 above), not a code or design change. Architecture is not re-opened.
Downstream Testing/QA will remain blocked until the key is provisioned; once it is, the pipeline
self-enforces the curl-200 condition via MF6 and no further architecture involvement is expected.
