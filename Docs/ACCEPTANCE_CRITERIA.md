# GoneOps Stabilization Acceptance Criteria

Status: Stabilization
Format: pass/fail criteria

## 1. Seed Demo Data Separation

Pass:

- Seed records for `goneops-demo` are explicitly identifiable as seed/demo data.
- Platform Admin queries can exclude seed/demo records without relying on name matching alone.
- `goneops-demo` localhost secrets and simulated pipeline rows are not counted as real runtime inventory.
- Re-running database initialization does not reintroduce demo inventory into Platform Admin views.
- Documentation states whether the chosen boundary is tags, separate tables, separate DB, or another deterministic mechanism.

Fail:

- Platform Overview, Capacity, Service Map, Providers, Hosts, VMs, or Containers can display seed/demo rows as if they were discovered infrastructure.
- Seed data is used as a fallback when discovered inventory is missing.
- A reviewer cannot tell which rows are seed/demo versus discovered by inspecting the database.

## 2. Real Inventory Source Of Truth

Pass:

- Proxmox sync populates normalized `providers`, `hosts`, `vms`, `containers`, and `sync_jobs` records.
- Platform Admin views read normalized backend inventory APIs.
- Dashboard, Service Map, Capacity, and Applications runtime views do not call Proxmox APIs directly.
- The credentialed Proxmox control-plane tables remain separate from normalized inventory views.

Fail:

- Frontend dashboard pages call `/api/proxmox/*` to render platform summary, capacity, service map, or runtime location.
- Platform Admin views mix direct Proxmox responses with normalized inventory rows.
- Inventory counts change only because seed records exist.

## 3. `goneops-demo` Application Link

Pass:

- An `applications` row exists for `goneops-demo`.
- That application is linked to the `goneops-demo` project.
- The application status and environment count are derived from linked runtime/inventory state or explicitly marked unknown, not inferred from seed services alone.

Fail:

- `GET /api/inventory/mapping/goneops-demo` returns `not_found` while the `goneops-demo` project exists.
- `goneops-demo` exists only as a project and has no application identity in Platform Admin.
- Application state is inferred only from seed services.

## 4. Runtime Location Link

Pass:

- The `goneops-demo` dev environment is linked to the actual runtime LXC/container using VMID/provider/node metadata.
- The discovered `docker-host` runtime row is linked to the application and environment.
- The mapping chain can resolve: application -> environment -> service -> runtime asset -> host/node -> provider.
- `asset_relationships` contains the required infrastructure relationships for the linked runtime asset, host/node, and provider where the product relies on relationship traversal.

Fail:

- `vms.application_id`, `vms.environment_id`, `containers.application_id`, and `containers.environment_id` remain null for the runtime asset that hosts `goneops-demo`.
- Runtime APIs return services but no provider, host/node, VMID, container/LXC, status, or IP data.
- The service map can show infrastructure but cannot explain which application owns it.

## 5. Runtime API Behavior

Pass:

- `GET /api/projects/1/runtime` returns at least one service row for `goneops-demo` with environment, provider, host/node, runtime asset, and status fields populated from discovered inventory.
- `GET /api/inventory/mapping/goneops-demo` returns application, environments, services, and runtime objects.
- Empty runtime responses are reserved for genuinely unlinked applications, not for the seeded demo app after sync/backfill.

Fail:

- `GET /api/projects/1/runtime` returns an empty `services` array after the Proxmox inventory is synced and the runtime link is expected to exist.
- `GET /api/inventory/mapping/goneops-demo` returns `not_found`.
- Runtime responses contain only seed service definitions with no discovered provider/host/runtime location.

## 6. View Ownership Rules

Pass:

- DX sandbox preview views are allowed to use seed/demo and generated sandbox data.
- Platform Admin views use discovered inventory and runtime links.
- Documentation identifies the source and owner for each major view.
- VezClick remains responsible for SDLC planning/generation; GoneOps Platform Admin remains responsible for runtime visibility.

Fail:

- A Platform Admin view depends on seed demo services to look populated.
- A DX view is treated as the authority for runtime location.
- The source-of-truth rule differs by page without documentation.

## 7. Stabilization Scope Control

Pass:

- Changes are limited to data classification, linking, backfill, documentation, and verification.
- No new provider type, provisioning workflow, dashboard redesign, or SDLC feature is introduced.
- Existing APIs remain compatible unless changed specifically to enforce source-of-truth correctness.

Fail:

- Stabilization work ships new product features unrelated to source separation or runtime mapping.
- The fix depends on a new dashboard design instead of correcting the data contract.
- Runtime visibility requires the frontend to bypass backend inventory APIs.
