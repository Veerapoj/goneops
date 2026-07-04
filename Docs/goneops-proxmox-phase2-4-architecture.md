# GoneOps Proxmox Manager — Phases 2–4 Architecture Decision

Status: **Accepted** (architecture stage, workflow `wf-20260704-goneops-proxmox-p2`)
Scope: Phase 2 (power actions + UPID task tracking + audit), Phase 3 (clone/snapshot/rollback),
Phase 4 (RBAC + approval workflow + quota), plus Templates/Snapshots/Tasks frontend pages.
Hard constraint (all phases): **Delete VM and delete-snapshot are never implemented.**

This document resolves the decisions the planning stage (`task_plan` M7) deferred to architecture.
It is the authoritative design contract the implementation stage must follow. It does not change
Phase 1 code; it constrains what Phase 2–4 code will look like.

---

## 1. Layering & file placement (no new patterns)

Phase 2–4 reuses the exact Phase 1 seam and adds nothing structurally new:

- `backend/src/lib/proxmoxClient.js` — thin Proxmox REST v2 wrappers, one per API call, keeping the
  existing `typeof client.get === 'function' ? client : createClient(client)` instance-normalizing
  guard. No new TLS/auth behavior; the per-provider `https.Agent` (verify_ssl) stays the only TLS surface.
- `backend/src/services/proxmoxService.js` — orchestration: decrypt token, build client, locate VM,
  call client, persist rows (`proxmox_tasks`, `audit_logs`, `approval_requests`), enforce quota.
- `backend/src/routes/proxmox.js` — HTTP surface, mounted unchanged via `app.use('/api/proxmox', ...)`
  in `app.js`. Same `try/catch/next` + `err.status`/`err.code='validation_error'` envelope as today.
- `backend/src/services/inventorySchema.js` — all new tables/columns are appended to
  `inventorySchemaSql` (idempotent `CREATE TABLE IF NOT EXISTS` / additive columns), executed by
  `ensureInventorySchema()`. `database/init.sql` is NOT touched.

**Decision D0 — VM location:** the node/type scan loop currently inline in `getVMDetail` is extracted
to a shared `locateVM(client, vmid) -> { node, type }` helper and reused by every mutating action, so
VM-lookup logic has one source of truth. Cost (scan all nodes' qemu+lxc per action) is accepted at
lab scale; **no node-mapping cache** is introduced (a stale cache could target the wrong node for a
destructive-ish action, which is worse than the scan cost).

---

## 2. Phase 2 — power actions, task tracking, audit

**Endpoints** (provider_id in body for mutations, in query for the task read):
- `POST /api/proxmox/vms/:id/start` · `/stop` · `/reboot` — body `{ provider_id }`.
- `GET  /api/proxmox/tasks/:upid?provider_id=` — the node is parsed from the UPID
  (`UPID:<node>:...`), so only `provider_id` is needed to pick the connection.

**proxmoxClient additions:** `startVM/stopVM/rebootVM(client, node, vmid, type)` →
`POST /nodes/{node}/{qemu|lxc}/{vmid}/status/{start|stop|reboot}`; `getTaskStatus(client, node, upid)`
→ `GET /nodes/{node}/tasks/{upid}/status`.

**Async contract (Decision D1):** every Proxmox mutating call returns a **UPID immediately**; the HTTP
200/202 from GoneOps means *submitted*, never *completed*. Each submission inserts a `proxmox_tasks`
row (`status='running'`) and returns the UPID. Final status is only known by polling
`GET /tasks/:upid`, which updates the local row. The frontend must poll, not assume success.

**Decision D2 — audit vs. task-poll spam:** "audit logs for every action" (Docs req. 14) is
interpreted as **every mutating action**. Each start/stop/reboot/clone/snapshot/rollback writes one
`audit_logs` row (with the resulting UPID in `metadata`). `GET /tasks/:upid` is a **read** and writes
**no** audit row — it is polled repeatedly by the UI and would otherwise flood the audit trail. The
originating mutation's audit row already carries the UPID, so the action remains fully traceable.
An audit row is also written on **failure** (result `'failure'`) when a Proxmox call errors, so
unreachable-host / permission failures are captured rather than lost.

---

## 3. Phase 3 — clone, snapshot, rollback (+ read endpoints)

**Mutating endpoints:**
- `POST /api/proxmox/templates/:id/clone` — body `{ provider_id, name, target_node? }`. Target vmid is
  obtained from `GET /cluster/nextid` (`getNextId`), then `POST /nodes/{node}/qemu/{vmid}/clone`.
- `POST /api/proxmox/vms/:id/snapshot` — body `{ provider_id, snapname, description? }`.
- `POST /api/proxmox/vms/:id/rollback` — body `{ provider_id, snapname }`.

**Read endpoints (Decision D3 — confirmed, not scope creep):** the Docs UI-page list mandates
**Templates** and **Snapshots** pages, but the Docs endpoint list only names the write actions. Two
read endpoints are therefore added to back those mandatory pages — this is the minimum needed, not an
expansion of capability:
- `GET /api/proxmox/providers/:id/templates` — `listVMs()` qemu results filtered to `template === 1`.
- `GET /api/proxmox/vms/:id/snapshots?provider_id=` — `GET /nodes/{node}/{qemu|lxc}/{vmid}/snapshot`.

**Exclusion (reaffirmed):** no snapshot-delete and no VM-delete endpoint is added anywhere, consistent
with the permanent Delete-VM constraint and the Docs endpoint list (which lists rollback, never delete).

All three mutations write a `proxmox_tasks` row (clone/snapshot/rollback all return a UPID) and an
`audit_logs` row (`action` = `template_clone` / `snapshot_create` / `snapshot_rollback`).

---

## 4. Phase 4 — RBAC, approval workflow, quota

There is **no users/auth/sessions table anywhere in the codebase** (verified in Phase 1 planning). A
full login system is out of proportion for a lab/admin tool and is not what this task authorizes.

### Decision D4 — RBAC = header-based roles, enforced by middleware

- Roles: **`viewer` < `operator` < `admin`** (a static ordered map in code, not a DB table — there are
  no persisted users to attach roles to).
- Transport: request header **`X-GoneOps-Role`**. Actor for audit = optional header
  **`X-GoneOps-Actor`** (falls back to the role name, then `'system'`).
- **Default when the header is absent = `viewer`** (read-only), satisfying Docs safety req.
  "Default mode must be read-only." A missing/invalid role can never perform a write.
- Enforcement: Express middleware `requireRole('operator'|'admin')` applied per-route in
  `proxmox.js`. Returns `403 { code: 'forbidden' }` when the caller's role rank is insufficient.

Permission matrix:

| Action                                   | Min role | Approval? |
|------------------------------------------|----------|-----------|
| All GET reads (nodes, vms, templates, snapshots, tasks, audit) | viewer   | no |
| start / stop / reboot                    | operator | no |
| snapshot create                          | operator | no |
| **clone from template**                  | operator to request, admin to execute | **yes** |
| **rollback snapshot**                    | operator to request, admin to execute | **yes** |
| approve / reject an approval request     | admin    | — |
| provider create / sync                   | operator | no |

This is explicitly a **lab-scoped mechanism** to be replaced by real authentication later; it is
recorded as such so the swap is a known, bounded change and the header trust boundary is not mistaken
for production auth.

### Decision D5 — Approval workflow gates the two high-blast-radius actions only

`clone` (can exhaust node storage/resources) and `rollback` (discards live VM state) require approval;
start/stop/reboot/snapshot-create do not (they are reversible / low blast radius and stay operator-executable).

- New table `approval_requests` (see §5).
- `operator` calling clone/rollback → a `pending` `approval_requests` row is created, **no Proxmox call
  is made**, response `202 { approval_id, status: 'pending' }`. An `audit_logs` row is written at
  request time (`action` = `clone_requested` / `rollback_requested`).
- `admin` calling the same endpoint executes **immediately** (still audited), OR approves a pending
  request via `POST /api/proxmox/approvals/:id/approve` which then executes the stored payload against
  Proxmox and creates the `proxmox_tasks` row. `POST /api/proxmox/approvals/:id/reject` closes it
  without executing. Both decisions write an `audit_logs` row (`action` = `approval_approve` /
  `approval_reject`). `GET /api/proxmox/approvals` lists requests for the Tasks/approvals UI.
- Request lifecycle: `pending -> approved -> executed | failed`, or `pending -> rejected`.

### Decision D6 — Quota = per-provider VM cap, checked before the Proxmox call

- Add nullable column **`quota_max_vms INTEGER`** to `proxmox_providers` (`NULL` = unlimited; default
  `NULL` so the existing registered provider is unaffected). This matches the Phase 1 convention of
  extending existing tables rather than inventing new quota infrastructure.
- Enforced **only at clone time** (the only action that creates new VMs). Before `getNextId`/clone, the
  service counts current qemu guests for the provider; if `count >= quota_max_vms` it rejects with
  `422 { code: 'quota_exceeded' }` **before any Proxmox mutation**, and writes a `failure` audit row.
- When approval is required, the quota check runs at **execution** time (approve), so a stale pending
  request cannot bypass a quota that filled up while it waited.

---

## 5. Schema additions (appended to `inventorySchemaSql`, idempotent)

```sql
-- Phase 2: local history of submitted async Proxmox tasks (Proxmox has no cross-action task list API)
CREATE TABLE IF NOT EXISTS proxmox_tasks (
    id SERIAL PRIMARY KEY,
    upid TEXT NOT NULL UNIQUE,
    provider_id INTEGER REFERENCES proxmox_providers(id) ON DELETE SET NULL,
    node VARCHAR(255),
    vmid VARCHAR(100),
    type VARCHAR(20),                         -- 'qemu' | 'lxc'
    action VARCHAR(100) NOT NULL,             -- vm_start|vm_stop|vm_reboot|template_clone|snapshot_create|snapshot_rollback
    status VARCHAR(50) DEFAULT 'running',     -- running|OK|error|unknown
    exit_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_polled_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_proxmox_tasks_provider ON proxmox_tasks(provider_id);
CREATE INDEX IF NOT EXISTS idx_proxmox_tasks_status ON proxmox_tasks(status);

-- Phase 4: approval workflow for clone/rollback
CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    requested_by VARCHAR(255),
    action VARCHAR(100) NOT NULL,             -- template_clone | snapshot_rollback
    resource_type VARCHAR(100),               -- 'template' | 'vm'
    resource_id VARCHAR(100),                 -- vmid
    provider_id INTEGER REFERENCES proxmox_providers(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}'::jsonb,        -- {name,target_node,snapname,...}
    status VARCHAR(50) DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','executed','failed')),
    approved_by VARCHAR(255),
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_provider ON approval_requests(provider_id);

-- Phase 4: per-provider quota (additive column, NULL = unlimited)
ALTER TABLE proxmox_providers ADD COLUMN IF NOT EXISTS quota_max_vms INTEGER;
```

These tables are Proxmox-Manager-only and stay isolated from the read-only Inventory tables
(`hosts`/`vms`/`containers`), preserving Inventory's read-only guarantee.

---

## 6. Frontend

- New pages under `frontend/src/pages/platform/proxmox/`: `Templates.jsx` (list + Clone form),
  `Snapshots.jsx` (per-VM snapshot list + Create + Rollback-with-confirmation), `Tasks.jsx`
  (`proxmox_tasks` history + live poll of `GET /tasks/:upid` + pending approvals). All match the Phase 1
  page conventions exactly (rounded-2xl cards, `border-slate-200`, `Loader2` spinner,
  `AlertTriangle` + retry, empty states).
- `VirtualMachines.jsx` detail panel gains Start/Stop/Reboot buttons, each behind an explicit
  confirmation step (Docs safety req. "write actions require explicit confirmation"), plus
  Snapshot/Rollback entry points.
- Routes added to `App.jsx` under the existing `PlatformLayout`; nav entries added to the existing
  `PROXMOX` group in `PlatformLayout.jsx` using verified lucide-react `^0.441.0` icons — `Copy`
  (Templates), `GitGraph` (Snapshots, already imported), `ListChecks` (Tasks).
- `frontend/src/api/client.js` gains `startVM/stopVM/rebootVM/fetchTaskStatus/fetchTasks/
  cloneTemplate/createSnapshot/rollbackSnapshot/fetchSnapshots/fetchTemplates/listApprovals/
  approveRequest/rejectRequest`, all via the shared axios client.

**Decision D7 — role on the frontend:** the axios client attaches `X-GoneOps-Role` from
`localStorage` (a simple topbar role selector), defaulting to `operator` for this admin tool. The
backend independently defaults a *missing* header to `viewer`, so the security decision always lives on
the server, never the client. This keeps the UI usable without a login while keeping the trust boundary
server-side.

---

## 7. Verification gates carried into implementation

- `rg` across `routes/proxmox.js` + `services/proxmoxService.js` confirms **no delete-VM and no
  delete-snapshot handler** exists.
- `node --check` on every new/changed backend file; frontend build passes.
- Every mutating route writes exactly one `audit_logs` row (success or failure); `GET /tasks/:upid`
  writes none.
- Every async action (start/stop/reboot/clone/snapshot/rollback) writes one `proxmox_tasks` row keyed
  by UPID.
- No token/secret appears in any response body, log line, or audit message.
- `192.168.1.165:8006` unreachable from CI degrades to a clear error envelope + `failure` audit row,
  never a crash/hang.
