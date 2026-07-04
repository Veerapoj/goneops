# GoneOps Proxmox Manager — End-to-End Test Architecture (Phases 1–4)

Status: **Accepted** — architecture stage of `wf-20260704-goneops-test`.
Scope: the test contract the implementation stage builds and the testing stage runs.
Targets (authoritative, from the task): frontend `http://192.168.1.147:3000`, backend
`http://192.168.1.147:4000/api/proxmox`, Proxmox host `192.168.1.165:8006`, provider `id=1`
("Proxmox Lab", status=connected). Ground truth confirmed live during planning and re-confirmed
against source in this stage.

This document resolves every open decision so the implementation stage writes test code, not
design. It does **not** run the tests — the testing stage does.

## 1. Decisions

### D1 — Two artifacts, no new harness
Reuse the two harnesses that already exist rather than inventing scaffolding:
1. **Frontend:** a new Playwright spec `tests/e2e/specs/09-proxmox-manager.spec.js`, following the
   conventions of `08-platform-layout.spec.js` (console/pageerror capture into an `errors` array
   asserted empty, `page.locator('aside')` sidebar checks, per-route screenshots into
   `artifacts/`). Run with `GONEOPS_BASE_URL=http://192.168.1.147:3000 npx playwright test` from
   `tests/e2e/`; `playwright.config.js` already honors `GONEOPS_BASE_URL` (default `localhost:13000`,
   which is the wrong target and must be overridden).
2. **Backend:** a new standalone script `backend/test/proxmox-e2e.js` copying the
   `request()` / `check()` / `waitFor()` helper shape from `backend/test/smoke.js` (fetch wrapper
   returning `{response, body}`, `check(name, fn)` incrementing a `passed` counter and printing
   `PASS <name>`, terminal `RESULT <passed> passed, <failed> failed`). Target via
   `GONEOPS_API_URL=http://192.168.1.147:4000/api/proxmox node backend/test/proxmox-e2e.js`.
   It must **not** be the existing `smoke.js` (that suite is the unrelated project/sandbox/Docker
   lifecycle and is out of scope here).

### D2 — Frontend routes under test (8)
`/platform` (Platform Admin dashboard) plus the 7 PROXMOX nav entries confirmed at
`frontend/src/layout/PlatformLayout.jsx:44-52` and routed at `frontend/src/App.jsx:67-73`:
`/platform/proxmox/{providers,nodes,vms,templates,snapshots,tasks,audit-logs}`.
Per route assert: `aside` sidebar visible (240px admin sidebar), body contains
`GoneOps Platform Admin`, the main content region is non-empty, and no console/page errors fired.
Proxmox pages are provider-scoped reads and do **not** require the `.fixture.json`
project/environment selection used by DX specs; navigate directly (a thin `openPage(page, route)`
that just `page.goto(route)` is acceptable rather than `openFixturePage`).

### D3 — Backend endpoints under test (all 21 routes in `backend/src/routes/proxmox.js`)
Reads (no role gate): `GET /providers`, `GET /providers/:id/nodes`, `GET /providers/:id/vms`,
`GET /providers/:id/templates`, `GET /vms/:id?provider_id=`, `GET /vms/:id/snapshots?provider_id=`,
`GET /tasks`, `GET /tasks/:upid?provider_id=`, `GET /approvals`, `GET /audit-logs`.
Writes (role-gated): `POST /providers` (operator), `POST /providers/:id/test` (operator),
`POST /vms/:id/{start,stop,reboot}` (operator), `POST /vms/:id/snapshot` (operator),
`POST /vms/:id/rollback` (operator-gated, admin-branch), `POST /templates/:id/clone`
(operator-gated, admin-branch), `POST /sync-inventory` (operator),
`POST /approvals/:id/{approve,reject}` (admin).

### D4 — Inventory assertions (exact counts)
Against provider `id=1`: `GET /providers/:id/nodes` → exactly **1** node (`pve`);
`GET /providers/:id/vms` → exactly **6** VMs = **1 qemu + 5 lxc**. Expected identities to assert by
`vmid`/`type`: 100 qemu `test-vm` (stopped), 200 `redis-svc`, 201 `postgres-svc`,
202 `mongodb-svc`, 203 `rabbitmq-svc` (lxc, running), 204 `monitoring` (lxc, stopped). The test
asserts counts and the type split; exact names are logged and asserted where present but a name
drift is a WARN, a count/type-split drift is a FAIL.

### D5 — RBAC probe semantics (from `proxmoxService.js:595-618`)
`getRole` reads header `x-goneops-role`, lowercased, and falls back to `viewer` for
missing/invalid values; `requireRole(min)` returns **403 `forbidden`** when
`ROLE_ORDER[role] < ROLE_ORDER[min]` (`viewer 0 < operator 1 < admin 2`). Probes:
- No header **or** `x-goneops-role: viewer` → every operator-gated write returns **403**.
- `x-goneops-role: operator` → passes the role gate (may still 400 on a missing body param — a 400
  here is a PASS for the RBAC assertion since it proves the gate was cleared, not a FAIL).
- Approve/reject require **admin**: operator/viewer → 403.
This is a header-asserted role, **not** an identity/authorization boundary; the report must state
that plainly and not imply a stronger guarantee.

### D6 — Clone/rollback are gated **and** approval-branched — assert differently from start/stop
`POST /templates/:id/clone` and `POST /vms/:id/rollback` both `requireRole('operator')` first, then
branch on `req.goneopsRole` (routes lines 209-226, 241-258): **admin** executes directly; any
non-admin that cleared the operator gate (i.e. `operator`) gets a **202** with
`{approval_id, status:'pending'}` and **no Proxmox call**. Correct expected results:
`viewer/no-header → 403`; `operator → 202 pending`; `admin → executes (200)`. A test that expects a
uniform "operator allowed → 200" across all writes will falsely fail clone/rollback — treat the
**202 pending** as the passing result for operator on these two.

### D7 — Real lifecycle only on vmid 100; async = poll to terminal
Exercise start/stop only on **vmid 100 (`test-vm`, qemu, stopped)** — the only non-service VM.
The four running service containers (200/201/203 + 202) must not be touched. Writes return a
**UPID immediately** (200 = submitted, not done); assert a UPID is returned, then
`waitFor` on `GET /tasks/:upid?provider_id=1` until `status` is terminal before asserting success.
After the start, issue the matching stop and poll to terminal to **restore vmid 100 to stopped**
(its original state) in both the success path and the script's `catch` cleanup, mirroring smoke.js.

### D8 — Approval end-to-end (operator requests → admin approves)
For clone (safest, creates a new VM only on approve) and/or rollback: operator POST → capture
`approval_id` from the 202; `GET /approvals` lists it as `pending`; `POST /approvals/:id/approve`
with `x-goneops-role: admin` transitions it and (for approve) triggers the underlying action.
`POST /approvals/:id/reject` path is asserted with a separately-created request so the report can
show both decision branches without executing a real clone if resource pressure is a concern
(clone approval execution is OPTIONAL and gated behind an env flag `PROXMOX_E2E_ALLOW_CLONE` —
default off — so the default run proves the approval workflow state machine without spawning VMs).

### D9 — Audit-log verification
`GET /audit-logs` before and after the lifecycle block; assert new rows appear for the
`vm_start` / `vm_stop` actions performed on vmid 100 (and for the approval request/decision).
Snapshot the pre-count and assert post-count strictly greater plus the expected action strings.

### D10 — Reporting
Extend `Docs/goneops-proxmox-manager-test-report.md`'s structure into a fresh report with explicit
**pass/fail counts per area**: frontend pages (8), backend endpoints (21 routes touched),
RBAC probes, inventory counts (1 node / 6 VMs / 1 qemu+5 lxc), VM lifecycle, approval workflow,
audit logs. The report must state results are against the **live 192.168.1.147 / 192.168.1.165
stack**, explicitly not the `13000/14000` override from the prior same-day run, and must describe
RBAC as a header-based lab mechanism.

## 2. Components (implementation-stage build list)
- `tests/e2e/specs/09-proxmox-manager.spec.js` — 8-route render spec (D2), screenshots to
  `artifacts/`, `errors` array asserted empty.
- `backend/test/proxmox-e2e.js` — API script (D1 helpers) covering D3–D9: reads, inventory counts,
  RBAC 403/allow probes, vmid-100 start/stop lifecycle with UPID polling + restore, clone/rollback
  approval-branch assertions, approval approve/reject, audit-log delta.
- `Docs/goneops-proxmox-e2e-test-report.md` (or extend the existing report) — D10 pass/fail counts.
- No production `backend/src` or `frontend/src` changes: this is a test-only workflow; if a test
  reveals a defect, the workflow's `on_fail` edge routes back, code is not patched inside this task.

## 3. Constraints (binding on implementation + testing)
- Targets are fixed: frontend `:3000`, backend `:4000/api/proxmox`, provider `id=1`. The
  `13000/14000` override and its prior PASS report are **not** evidence for this task.
- Lifecycle writes touch **only vmid 100**; service containers 200/201/202/203 are never
  started/stopped/rebooted/rolled back. vmid 100 is restored to `stopped` on every exit path.
- No `DELETE` of any kind (VM or snapshot) is invoked — none exists in the API and none is added.
- Every async write is polled via `GET /tasks/:upid` to a terminal state before a pass is claimed;
  a bare 200/202 is never treated as completion.
- clone/rollback expected results are role-specific: `viewer→403`, `operator→202 pending`,
  `admin→execute`; do not assert uniform operator-200.
- Real clone execution on approval is OPTIONAL and off by default (`PROXMOX_E2E_ALLOW_CLONE`); the
  default run proves the approval state machine without creating VMs.
- RBAC is reported as a self-asserted `x-goneops-role` header (lab mechanism), never as a real
  identity/authz boundary.
- If the runner lacks LAN route to 192.168.1.147/165, all live assertions fail for connectivity,
  not code — the report must distinguish connectivity failures from functional failures.
- No token/secret values may appear in any test output, screenshot, log, or report.
