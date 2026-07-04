# GoneOps Proxmox Manager — Final Phase Architecture Decision

Status: **Accepted** (architecture stage, workflow `wf-20260704-goneops-final`)
Scope: DELETE VM/LXC endpoints (admin-only + audit), decommission of the 6 test instances,
provisioning of real infrastructure (Docker Host LXC, K8s master/worker VMs, PBS VM), removal of
mock seed data + real inventory sync, and replacement of the two remaining hardcoded frontend
datasets (ServiceMap, Capacity).

This document resolves the design decisions the planning stage (`task_plan` M1–M10) deferred to
architecture. It is the authoritative contract the implementation stage must follow and reuses the
existing Phase 1–4 seam without introducing new structural patterns.

---

## 0. Explicit constraint reversal (recorded, not an oversight)

`Docs/goneops-proxmox-manager.md:33` and `Docs/goneops-proxmox-phase2-4-architecture.md:6,78-79,221`
state Delete-VM is *permanently* excluded from every phase. **This task deliberately reverses that
constraint.** The reversal is authorized by the current task statement and is recorded here so review
does not flag the new mutation surface as scope creep. To bound the new risk, delete is gated at three
layers (admin RBAC + required `provider_id` + a typed-confirmation UI dialog) and every attempt —
success or failure — writes an `audit_logs` row. No approval-queue path is used for delete (the task
specifies plain admin-only RBAC, matching the existing `/approvals/:id/approve` gate). The prior docs
are left in place; this file supersedes their delete exclusion for this workflow only.

---

## 1. Layering & file placement (no new patterns)

Reuse the exact three-layer seam already in place:

- `backend/src/lib/proxmoxClient.js` — thin REST wrappers keeping the
  `typeof client.get === 'function' ? client : createClient(client)` instance-normalizing guard and
  the `type === 'lxc' ? 'lxc' : 'qemu'` sub-path switch. No new TLS/auth surface.
- `backend/src/services/proxmoxService.js` — orchestration: `getProviderWithSecret` → build client →
  `locateVM` → client call → persist `proxmox_tasks` via `insertTask` → `writeAuditLog` on both
  branches. New delete logic mirrors `powerAction()` exactly (service:325-368).
- `backend/src/routes/proxmox.js` — HTTP surface, `try/catch/next` + `err.status`/`err.code` envelope,
  `provider_id` required in body, mounted unchanged.
- `backend/src/services/inventorySchema.js` — the seed INSERT blocks (schema:214-277) are the live
  source of demo rows; `database/init.sql` holds a duplicate. Both must change together.

**Decision D0:** delete reuses the existing `locateVM(client, vmid)` helper (service:298-314) to
resolve `{ node, type }`; no new discovery loop is written.

---

## 2. Backend delete design (M1–M3)

**D1 — client (proxmoxClient.js):** add `deleteVM(client, node, vmid)` issuing
`DELETE /nodes/:node/qemu/:vmid` and `deleteLXC(client, node, vmid)` issuing
`DELETE /nodes/:node/lxc/:vmid`, each with the same instance-normalizing guard as `startVM/stopVM`,
returning `data` (the UPID). Both are added to `module.exports`. Proxmox requires the target to be
stopped before delete; the client passes the API error through unchanged (no silent catch).

**D2 — service (proxmoxService.js):** add `deleteInstance(providerId, vmid, actor)` that resolves the
provider, builds the client, calls `locateVM`, dispatches to `deleteVM`/`deleteLXC` by `type`, records
the returned UPID via `insertTask({ action: type === 'lxc' ? 'lxc_delete' : 'vm_delete' })`, and calls
`writeAuditLog` with `action` `vm_delete`/`lxc_delete`, `resource_type` `vm`/`lxc`, and the same
try/catch structure as `powerAction` (audit on success **and** failure). Exported from `module.exports`.
`actor` is threaded from `req.goneopsActor` (unlike `powerAction`'s hardcoded `'system'`) so the audit
trail attributes the destructive action to the caller.

**D3 — route (proxmox.js):** add `DELETE /vms/:id` and `DELETE /lxc/:id`, both wrapped in
`requireRole('admin')` (same gate as `/approvals/:id/approve`), both requiring `provider_id` in the body
with the standard 400 `validation_error` when missing, delegating to
`deleteInstance(provider_id, vmid, req.goneopsActor)`. No approval-queue branch. These two are the only
new mutation routes; M10 `rg` verifies nothing else was added.

---

## 3. Decommission of test instances (M5) — operational runbook, not code

The 6 live instances (vmid 100 test-vm qemu; 200 redis, 201 postgres, 202 mongo, 203 rabbitmq running
lxc; 204 monitoring stopped lxc) are removed via the new DELETE endpoints, **not** SQL. Order: stopped
instances first (100, 204), then each running service container (200–203) only after explicit
per-instance human confirmation, since these run real services. Each must be stopped (POST stop) before
delete. This step is live and irreversible and must run only from an environment that reaches
`192.168.1.165:8006` (confirmed reachable: `/version` returns 401). It is a supervised operation, never
an unattended batch.

---

## 4. Real infrastructure provisioning (M6)

**D4 — new client creation methods:** add `createLXC(client, node, body)` → `POST /nodes/:node/lxc` and
`createVM(client, node, body)` → `POST /nodes/:node/qemu`, plus `listStorageContent(client, node,
storage, contentType)` → `GET /nodes/:node/storage/:storage/content?content=vztmpl` so the Docker Host
LXC `ostemplate` can be discovered (existing `listTemplates` only finds QEMU templates via
`vm.template === 1`; there is no LXC template discovery today). VMIDs come from the existing
`getNextId(client)`.

**D5 — provisioning is a scripted service action, not a persistent HTTP surface.** The task requires
creating infrastructure once, not exposing a general create-VM API. Implementation adds a
`provisionInfrastructure` service helper (or a one-shot script under `backend/scripts/`) that: (a) Docker
Host LXC — `createLXC` from a discovered `vztmpl` with a supplied hostname/cores/memory/rootfs/net; (b)
K8s master + worker VMs — `cloneTemplate()` from an existing QEMU template if `listTemplates` finds one,
otherwise `createVM` with an ISO `cdrom` + empty disk; (c) PBS VM — `createVM` shell only. Every
creation writes an `audit_logs` row and an `insertTask` UPID, matching `cloneTemplate`.

**D6 — PBS is not fully API-provisionable.** Proxmox Backup Server ships as a bootable ISO, not a
clonable template. Architecture scope for PBS is: create an empty VM shell via `createVM` with the PBS
ISO attached as `cdrom` and a boot disk; the interactive OS install is an out-of-band manual step
documented in the runbook, not automated by the API. Review/testing must treat "PBS VM shell created +
ISO attached" as the acceptance bar, not "PBS installed and serving backups."

---

## 5. Seed-data removal & real sync (M7–M8)

**D7 — remove demo INSERTs from both files.** Delete the provider/hosts/containers/applications/
certificates/sync_jobs demo blocks referencing `Proxmox Cluster A`/`Kubernetes Prod`/`Docker Hosts`/
`Cloud Console` from `inventorySchema.js:214-277` **and** the duplicate block in `database/init.sql`.
Removing only one lets rows reappear from the other. The `CREATE TABLE` statements stay.

**D8 — one-time cleanup of already-seeded rows.** `ON CONFLICT DO NOTHING` seeding does not retroactively
delete prior inserts, so a guarded idempotent cleanup (delete the named demo providers and their
FK-linked child rows in dependency order: certificates → sync_jobs → containers → hosts → applications →
providers, matching the cross-linked-by-name joins) runs once against the running DB. This is executed
as a maintenance query/script, not left in the startup schema path (so it cannot delete future real
rows). After M6+M7, `POST /api/proxmox/sync-inventory` (operator) repopulates hosts/vms/containers from
the real provider; the one-way sync direction is unchanged.

---

## 6. Frontend (M4, M9)

**D9 — delete UI (VirtualMachines.jsx + client.js):** add `deleteProxmoxVM(vmid, providerId)` and
`deleteProxmoxLXC(vmid, providerId)` to `client.js` using the existing `getRoleHeaders()` /
`X-GoneOps-Role` pattern (axios `delete` with `{ data: { provider_id } }`). A Delete action is wired
into VirtualMachines.jsx, rendered/enabled only when `localStorage 'goneops-role' === 'admin'`
(consistent with commit bb882dd's role selector), and gated behind a **typed-confirmation** dialog
(user types the VM name/vmid) given irreversibility, plus a viewer/operator-safe hidden state.

**D10 — ServiceMap & Capacity real data:** these two pages have no backing API today. Add read-only
aggregation endpoints to the existing inventory router/service (matching `GET /platform/dashboard`):
`GET /platform/service-map` and `GET /platform/capacity`, backed by new `inventoryService` functions
that aggregate the real `hosts/vms/containers/applications` tables. Replace `DEPENDENCY_TREE/INFRA_TREE/
ENV_DATA` (ServiceMap.jsx) and `CAPACITY_DATA/IDLE_RESOURCES` (Capacity.jsx) constants with fetched
data, adding the standard Loader2/AlertTriangle+retry/empty states used by every other platform page.
`Governance.jsx`'s "Available in Phase 2/3" roadmap copy is left untouched — it is a future-phase
placeholder, not demo data. All other platform pages already fetch from the DB and become real
automatically once D7/D8 land.

---

## 7. Non-goals & guardrails

- No real authentication is added; RBAC stays header/`localStorage`-driven (a UI/API convention, not a
  security boundary) — same as the rest of the codebase.
- No general-purpose create-VM HTTP API; provisioning is a one-shot scripted action.
- No approval-queue path for delete.
- No changes to TLS handling, the sync direction, or `database/init.sql` `CREATE TABLE` statements.
- All destructive/provisioning/sync steps require live LAN reach to `192.168.1.165:8006` and must fail
  loudly (surface the connection error) rather than silently no-op.

## 8. Verification gate (M10)

`node --check` on all modified backend files; frontend build passes; `rg` confirms `DELETE /vms/:id`
and `DELETE /lxc/:id` are the only new mutation routes; live probes confirm both return 403 for
viewer/operator and succeed for admin; `audit_logs` rows exist for delete attempts (both outcomes); a
fresh DB bootstrap contains zero demo provider/host/container/application rows; ServiceMap/Capacity
render synced data with no remaining hardcoded constants.
