# GoneOps Proxmox Manager — Architecture (Phase 1)

Stage: architecture · Workflow: wf-20260703-goneops-proxmox · Phase 1 only
(provider connection, read-only node/VM/LXC discovery, one-way sync into Inventory).

This document grounds the Phase 1 plan (`task_plan`) in the existing GoneOps
codebase and fixes the concrete file/module boundaries, data model, API surface,
security design, and frontend wiring for the implementation stage. It deliberately
mirrors the read-only Inventory Platform architecture
(`Docs/goneops-platform-admin-architecture.md`) so the two subsystems stay
consistent while remaining **isolated** from each other.

---

## 1. System overview

The Proxmox Manager is a **separate subsystem** that lives inside the same
Express backend and React frontend but never merges into the Inventory core. It
adds one controlled read path against a live Proxmox host and a one-way sync into
the shared inventory tables. Inventory stays read-only from the user's
perspective; only the Proxmox sync job may write the rows it discovers.

Layered flow:

```
Frontend (PlatformLayout pages under /platform/proxmox/*)
    → api/client.js  (axios, baseURL /api)
        → routes/proxmox.js   (Express Router, mounted at /api/proxmox)
            → services/proxmoxService.js  (business logic, crypto, audit, sync)
                → lib/proxmoxClient.js     (Proxmox REST API v2 client)
                    → https://192.168.1.165:8006/api2/json  (PVEAPIToken auth)
                → lib/db.js query() pool → PostgreSQL
                    - proxmox_providers  (new, owns encrypted token)
                    - audit_logs         (new, action trail)
                    - hosts / vms / sync_jobs  (existing, sync target only)
```

Reuses existing patterns exactly: Express `router → service → query()` pool,
central error envelope `{error:{code,message,details}}`, axios shared client,
React Router v6 layout + inline nav groups, Tailwind pages with
`Loader2` / `AlertTriangle`+retry / empty states.

---

## 2. Components and file boundaries

| Component | File | Responsibility |
|---|---|---|
| Proxmox API client | `backend/src/lib/proxmoxClient.js` | Thin wrapper over Proxmox REST API v2. `testConnection()`, `getNodes()`, `getNodeVMs(node)` (qemu), `getNodeLXC(node)`, `getVM(node, vmid)`. Auth via `Authorization: PVEAPIToken=<user>!<tokenid>=<secret>` header. Dedicated `https.Agent({ rejectUnauthorized: verify_ssl })` scoped to this client only. Surfaces Proxmox errors clearly (no silent catch); never logs the token or Authorization header. |
| Service layer | `backend/src/services/proxmoxService.js` | `createProvider` (AES-256-GCM encrypt of token secret before insert), `listProviders`/`getProvider` (return redacted rows, never the secret), `testProviderConnection(id)`, `listNodes(id)`, `listVMs(id)`, `getVMDetail(id, node, vmid)`, `syncInventory(id)`, `listAuditLogs()`, and internal `writeAuditLog(...)`. Owns encrypt/decrypt; decrypted secret exists only transiently in memory when building a client. |
| Routes | `backend/src/routes/proxmox.js` | Exactly the six Phase 1 endpoints (below), `try/catch/next` per handler, mounted `app.use('/api/proxmox', proxmoxRoutes)` in `app.js`. Plus a read-only `GET /audit-logs` to back the Audit Logs page. No mutation/power/clone/snapshot/delete routes exist in this file. |
| Schema | `backend/src/services/inventorySchema.js` | Additive, idempotent `proxmox_providers` + `audit_logs` tables and indexes appended to the existing `inventorySchemaSql` template, executed by `ensureInventorySchema()` on server start. **Not** `database/init.sql` (that file is not the runtime bootstrap — confirmed in `server.js`). No existing table altered; no seed row carrying the real token. |
| Frontend pages | `frontend/src/pages/platform/proxmox/{Providers,Nodes,VirtualMachines,AuditLogs}.jsx` | Tailwind pages rendered under the existing `PlatformLayout`. Providers.jsx: Add Provider form (name, host, port, token_id, token_secret, verify_ssl) + Test Connection + Sync Inventory actions. |
| Frontend nav/routes | `frontend/src/layout/PlatformLayout.jsx`, `frontend/src/App.jsx` | New `PROXMOX` group in the platform admin's inline `platformNavGroups`; four routes registered under the existing `<PlatformLayout>` route wrapper. |
| Frontend client | `frontend/src/api/client.js` | `fetchProxmoxProviders`, `createProxmoxProvider`, `testProxmoxProvider`, `fetchProxmoxNodes`, `fetchProxmoxVMs`, `fetchProxmoxVM`, `syncProxmoxInventory`, `fetchProxmoxAuditLogs` — all via the shared axios client. |

---

## 3. Data model (ER design)

Both tables are new, additive, and idempotent (`CREATE TABLE IF NOT EXISTS`).
They are appended to the `inventorySchemaSql` template in
`backend/src/services/inventorySchema.js` after the existing inventory tables, so
they are created by `ensureInventorySchema()` at server start alongside the rest
of the schema. (`database/init.sql` is **not** the runtime bootstrap in this
codebase and must not be targeted.)

### 3.1 `proxmox_providers` (owns the encrypted credential)

Isolated from the generic Inventory `providers` table on purpose — do not reuse
or write into `providers` rows. The Proxmox host is registered here.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `name` | VARCHAR(255) NOT NULL | Display name |
| `host` | VARCHAR(255) NOT NULL | e.g. `192.168.1.165` |
| `port` | INTEGER NOT NULL DEFAULT 8006 | |
| `token_user` | VARCHAR(255) NOT NULL | e.g. `goneops@pve` |
| `token_id` | VARCHAR(255) NOT NULL | e.g. `goneops-api` |
| `token_secret_encrypted` | TEXT NOT NULL | AES-256-GCM payload `iv:authTag:ciphertext` (base64). Never returned by the API. |
| `verify_ssl` | BOOLEAN NOT NULL DEFAULT false | Self-signed host ⇒ default false |
| `status` | VARCHAR(50) DEFAULT 'unknown' CHECK IN ('connected','error','unknown') | Updated by test/sync |
| `last_tested_at` | TIMESTAMPTZ | |
| `last_synced_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ DEFAULT now | |
| UNIQUE | `(host, token_id)` | Prevent duplicate registration |

Indexes: `idx_proxmox_providers_status(status)`.

### 3.2 `audit_logs` (action trail for every Proxmox Manager action)

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `actor` | VARCHAR(255) | User/service performing the action (Phase 1: `system`/request-derived) |
| `action` | VARCHAR(100) NOT NULL | e.g. `provider.create`, `provider.test`, `inventory.sync` |
| `resource_type` | VARCHAR(50) | e.g. `provider`, `vm`, `node` |
| `resource_id` | VARCHAR(255) | Free-form id (vmid/node/provider id) |
| `provider_id` | INTEGER REFERENCES proxmox_providers(id) ON DELETE SET NULL | |
| `result` | VARCHAR(50) NOT NULL CHECK IN ('success','failure') | |
| `message` | TEXT | Human-readable, **never** contains token/secret/Authorization values |
| `metadata` | JSONB DEFAULT '{}' | Non-sensitive context (counts, node names) |
| `created_at` | TIMESTAMPTZ DEFAULT now | |

Indexes: `idx_audit_logs_provider(provider_id)`, `idx_audit_logs_action(action)`,
`idx_audit_logs_created(created_at DESC)`.

### 3.3 Sync target mapping (existing tables, write path = Proxmox sync only)

`syncInventory(id)` performs a one-way read from Proxmox and idempotent upserts:

- **Bridge row:** `syncInventory` first upserts a single generic Inventory
  `providers` row for this Proxmox host (`type='proxmox'`, name derived from the
  `proxmox_providers.name`, `ON CONFLICT (name) DO UPDATE`) and captures its
  `id`. Every host/vm/container it writes carries this non-NULL `provider_id`.
  This is required for idempotency: the `hosts`/`vms` unique constraints are
  `(hostname, provider_id)` / `(name, provider_id)`, and Postgres treats NULL as
  distinct in unique keys — a NULL `provider_id` would make `ON CONFLICT` never
  match and duplicate rows on every re-sync. The bridge `providers` row is the
  only Inventory `providers` write the Proxmox subsystem makes; it never touches
  the demo provider rows.
- Proxmox **node** → `hosts` (`host_type='host'`, non-NULL bridge `provider_id`)
  keyed by `UNIQUE (hostname, provider_id)` via `ON CONFLICT DO UPDATE`.
- Proxmox **qemu VM** → `vms` row keyed by `UNIQUE (name, provider_id)`,
  `ON CONFLICT DO UPDATE` (status, cpu_cores, memory_gb, disk_gb, vmid).
- Proxmox **LXC** → `containers` row (idempotent insert/update).
- Each sync writes one `sync_jobs` row (`job_type='proxmox_sync'`,
  found_count, status, message, started/completed_at) and one `audit_logs` row.

No write path back into Proxmox from Inventory; no modification of
`inventoryService.js` / `inventory.js`. Upserts are additive and idempotent so
re-running sync is safe.

---

## 4. API surface (Phase 1 — read + register only)

Mounted at `/api/proxmox`. **These are the only handlers in the router.**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/proxmox/providers` | Register a provider (encrypts secret; returns redacted row) |
| POST | `/api/proxmox/providers/:id/test` | Test connection; updates `status`/`last_tested_at`; audit row |
| GET | `/api/proxmox/providers/:id/nodes` | List Proxmox nodes (live read) |
| GET | `/api/proxmox/providers/:id/vms` | List VMs + LXC across nodes (live read) |
| GET | `/api/proxmox/vms/:id` | VM detail (`:id` = vmid; node resolved) |
| POST | `/api/proxmox/sync-inventory` | Sync nodes/VMs/LXC into Inventory; sync_job + audit row |
| GET | `/api/proxmox/audit-logs` | Read-only audit trail for the Audit Logs page |

Also `GET /api/proxmox/providers` (list, redacted) to back the Providers page.

**Explicitly excluded in Phase 1 and never in the router:** start, stop, reboot,
clone, snapshot, rollback, tasks/UPID. **Delete VM is permanently excluded in
every phase.**

---

## 5. Security design

- **Credential at rest:** token secret encrypted with AES-256-GCM inside
  `proxmoxService.js` using a 32-byte key from `PROXMOX_TOKEN_ENC_KEY`
  (added to `.env.example` and the backend `environment:` block in
  `docker-compose.yml`). Stored as `iv:authTag:ciphertext`. Decryption happens
  only transiently when constructing a Proxmox client.
  - **Architecture decision (supersedes the plan's plaintext-TEXT note):** the
    finalized `task_plan` proposed storing `token_secret` as plain TEXT to match
    the existing `secrets` table. This design instead encrypts at rest because a
    Proxmox API token is an infrastructure control-plane credential (higher blast
    radius than DX app env vars) and Core Requirement #2 states the token must be
    stored *securely*. The cost is one self-contained Node `crypto` module plus
    one env var — no new key-management service — so it does not violate the
    "reuse existing patterns / no new infrastructure" constraint in spirit.
  - **Key handling / graceful degradation:** if `PROXMOX_TOKEN_ENC_KEY` is unset
    the service fails provider *create* with a clear `500 config_error`
    ("encryption key not configured") rather than silently falling back to
    plaintext; existing HTTPS/DB behavior is unaffected. The key is read once at
    module load. A future hardening pass may migrate to a shared secrets vault.
- **Never exposed:** `listProviders`/`getProvider` select explicit columns and
  omit `token_secret_encrypted`; no service/router return value, `morgan`/
  `console.error` line, or `audit_logs.message` ever contains the secret or the
  raw `Authorization` header.
- **TLS scoping:** self-signed cert handled by a dedicated
  `https.Agent({ rejectUnauthorized: false })` bound to the Proxmox client only
  when `verify_ssl=false`; global TLS validation is never disabled.
- **Auth failures / unreachable host:** surfaced as a clear error envelope
  (e.g. `502 proxmox_unreachable`) and recorded as an `audit_logs` failure row;
  they degrade gracefully rather than crashing the request or blocking the build
  when `192.168.1.165` is not reachable from CI.

---

## 6. Frontend wiring (correction to plan)

The Proxmox pages render inside the **Platform Admin** shell, not the DX shell.
Grounded in code:

- Platform pages mount under `PlatformLayout` (`frontend/src/layout/PlatformLayout.jsx`),
  whose sidebar has its **own inline `platformNavGroups`** and a width of **240px**
  (`style={{ width: 240 }}`). The DX `Sidebar.jsx` (268px) is a different shell
  and must not be touched for this feature.
- **Correction:** the plan's "Sidebar.jsx / 268px" wording refers to the DX
  sidebar. The Proxmox nav group is added to `platformNavGroups` in
  `PlatformLayout.jsx`, preserving its existing **240px** width. No emojis;
  every `lucide-react` icon verified against the installed `^0.441.x`. Prefer
  reusing icons already imported in `PlatformLayout.jsx` (`Plug`, `Server`,
  `Cpu`, `Boxes`, `Container`, `History`, `Shield`) so no new import must be
  version-checked; e.g. Providers→`Plug`, Nodes→`Server`, Virtual Machines→`Cpu`
  (or `Boxes`), Audit Logs→`History`. Any new icon must be confirmed to exist in
  `^0.441.x` before use.
- Routes registered in `App.jsx` under the existing `<Route element={<PlatformLayout />}>`
  wrapper: `/platform/proxmox/providers`, `/platform/proxmox/nodes`,
  `/platform/proxmox/vms`, `/platform/proxmox/audit-logs`.
- `PlatformLayout` renders its own topbar text ("GoneOps Platform Admin"), so no
  separate `Topbar.jsx routeTitles` change is required for platform pages — page
  titles are rendered within each page (matching existing platform pages).

New `PROXMOX` nav group (in `platformNavGroups`):
Providers · Nodes · Virtual Machines · Audit Logs.

---

## 7. Constraints and scope discipline (hard gates)

1. Phase 1 is register + read + one-way sync only. No power/clone/snapshot/
   rollback/task endpoints; **Delete VM never implemented in any phase.**
2. `proxmox_providers` and `audit_logs` are new, additive, idempotent; no
   existing table altered; no seed row contains the real token.
3. Proxmox Manager is isolated from the Inventory core: no changes to
   `inventoryService.js`/`inventory.js`; the only write into shared `hosts`/
   `vms`/`containers`/`sync_jobs` is the Proxmox sync job (idempotent upserts).
   Inventory remains read-only from the user's perspective.
4. Token secret encrypted at rest (AES-256-GCM, `PROXMOX_TOKEN_ENC_KEY`), never
   returned by the API, never logged, never in audit messages.
5. Self-signed TLS relaxed only via a scoped `https.Agent`; global TLS never
   weakened.
6. Reuse existing patterns exactly (router→service→`query()` pool, error
   envelope, axios client, React Router v6 layout, Tailwind states).
7. Frontend: platform admin sidebar stays 240px; Tailwind only; no emoji;
   `lucide-react` icon names verified against installed version.
8. Handoff checks: `node --check` on new backend files, frontend build passes,
   `rg` across `routes/proxmox.js` + `services/proxmoxService.js` confirms no
   start/stop/reboot/clone/snapshot/rollback/delete handlers, and no token/secret
   value appears in any response body or log line.
