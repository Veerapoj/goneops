# GoneOps Stabilization Roadmap

Status: Stabilization
Constraint: no new features, no redesign

## Stabilization Goal

Make GoneOps trustworthy as a runtime visibility product by separating demo data from discovered infrastructure, linking `goneops-demo` to its real runtime location, and defining which data source is allowed to populate each view.

## Done

- `goneops-demo` seed project exists with a `dev` environment, four services, localhost-only secrets, and simulated pipeline steps.
- Proxmox sync populates normalized inventory tables with a Proxmox provider, `pve` host/node, QEMU VMs, and the `docker-host` LXC/container.
- Sandbox generation persists LXC runtime metadata on environments, including VMID, node, provider, IP, and status fields.
- Platform Admin pages consume backend APIs such as `/api/platform/dashboard`, `/api/platform/providers`, `/api/platform/hosts`, `/api/platform/containers`, `/api/platform/service-map`, and `/api/platform/capacity`.
- Backend inventory sync writes Proxmox data into normalized database tables, preserving the rule that dashboards do not call Proxmox directly.
- `asset_relationships` backfill creates partial infrastructure relationships for VM/container to host/provider where source rows are linked.

## Current Gap

The current data model contains the right ingredients but not a stable source-of-truth contract.

Seed DX data and real inventory data share the same database without a product-level separation rule. Discovered assets exist, but `goneops-demo` is not connected to the actual runtime LXC/node/provider chain. The API can therefore show a real infrastructure inventory while the application runtime view remains empty.

## Phase 1: Source Classification

Define how each record type is classified:

- Seed/demo: local DX project shape, demo service definitions, localhost secrets, simulated pipeline runs.
- Discovered: provider, host, VM, container, certificate, sync job, capacity, and infrastructure status records from inventory sync.
- Sandbox runtime: generated environment runtime metadata and files created by sandbox workflows.

Outcome: Platform Admin can exclude seed/demo data deterministically.

## Phase 2: Application Runtime Link

Create the product contract for linking `goneops-demo` to discovered runtime assets:

- `applications.project_id` points to the `goneops-demo` project.
- The dev environment identifies the real LXC runtime by VMID/provider/node.
- Discovered `containers` or `vms` rows carry the correct `application_id` and `environment_id`.
- Relationship rows express runtime containment and provider ownership where needed.

Outcome: mapping and runtime APIs return the real LXC, host/node, and provider chain.

## Phase 3: View Source Rules

Lock the view ownership matrix:

| View Area | Source | Owner |
| --- | --- | --- |
| DX Overview / Services / Secrets / Pipelines | Seed plus sandbox environment records | VezClick SDLC |
| Sandbox Files / Logs / Preview | Generated sandbox runtime | VezClick SDLC |
| Platform Overview | Discovered inventory tables | GoneOps Platform Admin |
| Providers / Hosts / VMs / Containers | Discovered inventory tables | GoneOps Platform Admin |
| Capacity / Service Map | Discovered inventory plus runtime links | GoneOps Platform Admin |
| Application Runtime Mapping | Discovered inventory plus application/environment links | GoneOps Platform Admin |

Outcome: every view has one declared source of truth.

## Phase 4: Regression Gates

Stabilization is complete when tests or manual probes prove:

- No Platform Admin view depends on seed demo rows.
- No dashboard page calls Proxmox directly.
- Runtime APIs return discovered infrastructure for `goneops-demo`.
- Removing or marking seed demo data does not erase real inventory.
- A Proxmox sync updates inventory without overwriting the source classification.

## What Is Next

The next implementation work should be limited to stabilization plumbing:

- Add or enforce source classification for demo, discovered, and sandbox runtime records.
- Ensure `goneops-demo` has a real `applications` row.
- Link the `goneops-demo` dev environment to the discovered `docker-host` runtime asset.
- Backfill `application_id` and `environment_id` on the matching VM/container inventory row.
- Verify mapping, runtime, service map, and capacity APIs use discovered data only.

Do not add new UI features, new provider types, or new SDLC workflows during this phase.
