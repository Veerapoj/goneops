# GoneOps Inventory Platform — Architecture Decision (Phase 1)

Status: Accepted · Stage: architecture · Scope: Phase 1 (read-only visibility)
Supersedes nothing · Feeds: implementation stage

This document is the authoritative architecture for the **GoneOps Inventory Platform**
module. It is grounded in the existing GoneOps codebase patterns (Express router +
service + `pg` pool; React Router v6 `Layout` with a 268px dark sidebar; Tailwind CSS;
`lucide-react` icons; idempotent `database/init.sql`). Phase 1 delivers **read-only
inventory visibility only — no provisioning, no mutation endpoints, no connector agent
execution**. Connectors are defined as an interface; live collection is seeded/stubbed.

---

## 1. System Architecture

```
┌──────────────────────────── Frontend (React + Tailwind) ────────────────────────────┐
│  Sidebar (PLATFORM group) → routes /platform/* → pages/platform/*.jsx                 │
│  api/client.js  (axios baseURL '/api')  → fetchPlatform* functions                    │
└───────────────────────────────────────┬──────────────────────────────────────────────┘
                                         │ HTTP GET /api/platform/*
┌───────────────────────────────────────▼──────────────────────────────────────────────┐
│  Backend (Express)  app.js → app.use('/api/platform', inventoryRoutes)                │
│  routes/inventory.js  (GET only, try/catch/next)                                      │
│        └── services/inventoryService.js  (query() via lib/db.js pool)                 │
│  [Phase 1 boundary] ── connectors/ interface defined, NOT executed (seed data only)   │
└───────────────────────────────────────┬──────────────────────────────────────────────┘
                                         │ SQL (read)
┌───────────────────────────────────────▼──────────────────────────────────────────────┐
│  PostgreSQL — database/init.sql                                                        │
│  providers · hosts · vms · containers · applications · certificates · sync_jobs       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

**Layer responsibilities**

- **Connector Layer** — Phase 1: define a plugin contract only (see §5). Providers are
  registered rows in `providers`; no SSH/Docker/Proxmox calls are made yet. Seed data
  stands in for collected data so the UI renders fully.
- **Discovery Engine** — Phase 1: represented by the `sync_jobs` table + a read-only
  status view. Actual scheduled discovery is Phase 2+. No worker process is added now.
- **Inventory Database** — 7 new tables (§3). Authoritative store for all inventory.
- **Application Mapping / CMDB / Lifecycle / Capacity** — modeled as columns and
  foreign keys now so Phase 2/3/4 can populate them without schema migration; UI shows
  the data read-only. No mapping engine or drift computation is built in Phase 1.

---

## 2. Service Boundaries (what this module does NOT do)

- No provisioning / no Terraform / Proxmox / VMware / cloud create-update-delete.
- No monitoring/alerting (belongs to System Doctor).
- No AI SDLC features (belongs to VezClick).
- No duplication of DX features (projects/environments/services/deployments stay in the
  existing `projects` router). Inventory *references* DX via `application.project_id`
  (nullable FK) for future enrichment; it does not re-implement them.
- All Phase 1 backend endpoints are **GET**. No POST/PUT/PATCH/DELETE for platform
  resources. This is a hard review gate.

---

## 3. Database ER Design (`database/init.sql`, additive, idempotent)

All tables use `CREATE TABLE IF NOT EXISTS`; all seeds use `ON CONFLICT DO NOTHING`.
Follows existing conventions: `SERIAL PRIMARY KEY`, `TIMESTAMP WITH TIME ZONE DEFAULT
CURRENT_TIMESTAMP`, `CHECK` constraints for enumerations, `ON DELETE` on FKs, and a
supporting index per FK/lookup column.

```
providers (1) ──< hosts (1) ──< containers
                     host (1) ──< vms
applications >── (nullable) project (DX projects.id)
applications (nullable) ──< certificates
providers (1) ──< sync_jobs
```

- **providers** — `id, name UNIQUE, type CHECK(docker|linux_ssh|proxmox|kubernetes|
  vmware|aws|gcp|azure), endpoint, status CHECK(connected|disconnected|error), region,
  last_sync_at, metadata JSONB DEFAULT '{}', created_at, updated_at`.
- **hosts** — `id, provider_id FK→providers ON DELETE CASCADE, hostname, ip_address,
  os, kernel, cpu_cores INT, memory_gb NUMERIC, disk_gb NUMERIC, cpu_usage_pct,
  memory_usage_pct, storage_usage_pct, uptime_seconds BIGINT, status CHECK(online|
  offline|degraded), os_eol DATE, metadata JSONB, created_at, updated_at`. Capacity +
  lifecycle columns live here (populated read-only). Index on `provider_id`.
- **vms** — `id, host_id FK→hosts ON DELETE CASCADE, name, ip_address, os, cpu_cores,
  memory_gb, disk_gb, status, metadata JSONB, ...`. Modeled now for Phase 2 hypervisor
  discovery; Phase 1 seeds a few rows but the primary read views are hosts/containers.
  Index on `host_id`.
- **containers** — `id, host_id FK→hosts ON DELETE CASCADE, name, image, status
  CHECK(running|stopped|paused|exited), ports VARCHAR, cpu_pct, memory_mb,
  application_id FK→applications (nullable, ON DELETE SET NULL), metadata JSONB, ...`.
  Index on `host_id` and `application_id`.
- **applications** — `id, name UNIQUE, environment CHECK(dev|uat|staging|prod),
  project_id FK→projects (nullable, ON DELETE SET NULL) [DX bridge], owner, team,
  business_unit, contact, sla_level, criticality CHECK(low|medium|high|critical),
  cost_center, version, status, metadata JSONB, ...`. CMDB/ownership columns present now.
- **certificates** — `id, domain, application_id FK→applications (nullable, ON DELETE
  SET NULL), issuer, expires_at DATE, owner, status CHECK(valid|expiring|expired),
  metadata JSONB, ...`. Index on `application_id`.
- **sync_jobs** — `id, provider_id FK→providers ON DELETE CASCADE, job_type
  CHECK(discovery|refresh), status CHECK(pending|running|success|failed), items_found
  INT DEFAULT 0, duration_ms INT DEFAULT 0, error TEXT, started_at, finished_at,
  created_at`. Index on `provider_id` and `(provider_id, created_at DESC)`.

**Seed data** (matches the JSX reference so the UI is non-empty): 2 providers,
~5 hosts, ~5 containers, 4 applications, 4 certificates, 4 sync jobs, keyed with
`ON CONFLICT DO NOTHING` / `NOT EXISTS` guards like the existing pipeline seed.

---

## 4. API Design (backend, GET-only, mounted at `/api/platform`)

`backend/src/routes/inventory.js` — Express `Router`, each handler `try { ... } catch
(e) { next(e) }`, delegates to the service. Mounted in `app.js` via
`app.use('/api/platform', inventoryRoutes)` (alongside the existing
`app.use('/api', projectRoutes)`).

| Method | Path                       | Returns |
|--------|----------------------------|---------|
| GET    | /api/platform/dashboard    | aggregate counts (hosts, vms, containers, apps, envs, issues) + resource summary + provider status |
| GET    | /api/platform/providers    | provider rows |
| GET    | /api/platform/hosts        | host rows (join provider name) |
| GET    | /api/platform/containers   | container rows (join host + app name) |
| GET    | /api/platform/applications | application rows |
| GET    | /api/platform/certificates | certificate rows |
| GET    | /api/platform/sync-jobs    | sync job rows (join provider name), newest first |

`backend/src/services/inventoryService.js` — one query function per endpoint
(`getDashboardStats, listProviders, listHosts, listContainers, listApplications,
listCertificates, listSyncJobs`), each using `query(sql, params)` from `lib/db.js`.
Errors bubble to the existing central error middleware; not-found/validation follow the
existing `err.status`/`err.code` convention where relevant (mostly N/A for list GETs).

Error envelope is the existing `{ error: { code, message, details } }`.

---

## 5. Connector Plugin Architecture (contract only in Phase 1)

Defined so Phase 2 can add real collectors without touching routes or schema. Each
connector is a module exporting a stable interface; **none are invoked in Phase 1**.

```
interface ProviderConnector {
  type: 'docker' | 'linux_ssh' | 'proxmox'      // Phase 1 targets
  testConnection(config): Promise<{ ok, error? }>
  discover(config): Promise<{ hosts[], vms[], containers[] }>   // Phase 2 execution
}
```

Phase 1 keeps this as documented shape + folder placeholder; `sync_jobs`/`providers`
rows are seeded to model the outcome. This avoids shipping SSH/Docker execution or any
credential handling before the read-only surface is reviewed.

---

## 6. Frontend Architecture

- **Sidebar** (`layout/Sidebar.jsx`) — add one `PLATFORM` entry to `navGroups` (the
  file renders `group.label` + `group.items`). Sub-menus: Overview, Discovery
  (Providers, Sync Jobs), Inventory (Hosts, Containers, Applications), Mapping
  (Service Map), Operations, Governance. Icons from installed `lucide-react`
  (`^0.441.x`) — use verified names (`Server`, `Boxes`/`Box`, `Container` if present
  else `Package`, `Network`, `ShieldCheck`, `Clock`, `HardDrive`, `Cpu`, `Activity`).
  **No emojis.** Keep 268px width and existing active/hover classes.
- **Routes** (`App.jsx`) — add `/platform`, `/platform/providers`,
  `/platform/discovery`, `/platform/inventory`, `/platform/containers`,
  `/platform/applications`, `/platform/mapping`, `/platform/operations`,
  `/platform/capacity`, `/platform/governance` under the existing `<Route
  element={<Layout />}>`.
- **Pages** (`frontend/src/pages/platform/*.jsx`) — convert the inline-styled reference
  render functions to Tailwind matching existing pages (rounded-2xl/`rounded-xl` cards,
  `border border-slate-200`, `bg-white`, `text-slate-*`, `Loader2` spinner, error+retry
  and empty states like `Overview.jsx`). Colors map: `#6366f1`→indigo-500,
  `#22c55e`→emerald-500, `#ef4444`→red-500, `#1a1d2e`→slate-900; no-match colors use
  arbitrary values `bg-[#hex]`. Expandable host rows use `useState`, not inline toggles.
- **API client** (`api/client.js`) — add `fetchPlatformDashboard, fetchProviders,
  fetchHosts, fetchContainers, fetchApplications, fetchCertificates, fetchSyncJobs`
  using the shared axios `client` (`GET /platform/*`).
- **Topbar** (`layout/Topbar.jsx`) — add the 10 new paths to `routeTitles`.

---

## 7. Integration with GoneOps DX

Loose coupling only. `applications.project_id` is a **nullable** FK to `projects.id`,
enabling a future "this app maps to DX project X / environment Y / runtime service" view
without importing DX logic or duplicating its tables. Phase 1 leaves it null-friendly;
no cross-writes from the platform module into DX tables.

---

## 8. Testing Strategy (for later stages)

- Backend: `node --check` on the two new files; unit-test each service query against a
  seeded DB; assert every `/api/platform/*` route responds 200 with expected shape;
  assert **no** non-GET route exists on the platform router (scope gate).
- Schema: apply `init.sql` to a clean PostgreSQL and re-apply (idempotency); verify FKs,
  CHECKs, and seed counts.
- Frontend: `npm run build` in `frontend/` (imports resolve, Tailwind JIT compiles,
  no JSX errors); smoke-render each platform page with loading/error/empty states.

---

## 9. Task Breakdown → implementation stage

Follows the accepted plan milestones M1–M10: (M1) schema+seed, (M2) PlatformOverview,
(M3) remaining pages, (M4) sidebar, (M5) service, (M6) routes+mount, (M7) App.jsx routes,
(M8) client fns, (M9) Topbar titles, (M10) build/verify + scope check.

---

## 10. Constraints & Review Gates

1. Phase 1 is read-only: platform router exposes **GET only**.
2. No provisioning / connector execution / credential handling ships in Phase 1.
3. `init.sql` additions are additive & idempotent (`IF NOT EXISTS`, `ON CONFLICT`).
4. Sidebar stays 268px; Tailwind only (no inline styles, no emojis).
5. New endpoints mounted at `/api/platform`; do not modify existing `projects` router.
6. Reuse existing patterns: router+service+`query()`, axios `client`, `Layout`, lucide.
7. Verify every lucide icon name against installed version before use.
8. DX coupling is a single nullable FK; no DX table writes from platform code.
