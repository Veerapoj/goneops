# GoneOps Stabilization Product Spec

Status: Stabilization
Owner: Product Architecture
Scope: data-source clarity, runtime visibility, and platform trust

## Problem Statement

GoneOps currently mixes three different kinds of data in one operating surface:

- Seed demo data for the `goneops-demo` project, dev environment, services, localhost secrets, and simulated pipeline history.
- Discovered inventory from Proxmox sync, including the provider, `pve` host, VMs, and the `docker-host` LXC.
- Sandbox runtime data produced by `generate-sandbox`, including environment LXC metadata and generated files under `/tmp/goneops-sandboxes`.

Because these records are not clearly separated or linked, the product cannot reliably answer the most important platform question: "Where is this application actually running?" The mapping chain has partial infrastructure relationships, but `goneops-demo` is not linked to the discovered runtime asset. As a result, `GET /api/inventory/mapping/:app` can return `not_found`, and `GET /api/projects/:id/runtime` can return an empty runtime view even when real Proxmox inventory exists.

This is a trust problem, not a feature gap. During stabilization, GoneOps must prove that Platform Admin views are backed by real discovered state, while demo seed records remain clearly bounded to local DX preview behavior.

## User Value

Platform Admin users need operational visibility they can trust. They should be able to open GoneOps and see the real Proxmox provider, node, LXC, VMs, containers, and their relationship to applications without wondering whether a number, service, or runtime location came from a demo seed.

VezClick and SDLC users still need a low-friction demo/sandbox experience. Seed data is useful for DX preview, onboarding, and local smoke tests, but it must not masquerade as production infrastructure.

The stabilized product value is:

- Clear source of truth for every view.
- Runtime mapping from application to discovered infrastructure.
- No direct Proxmox dependency from dashboards.
- A defensible boundary between SDLC planning/generation and Platform Admin runtime visibility.

## Stabilization Decisions

### 1. Separate Seed Demo Data From Real Inventory Data

Seed data exists to make local DX workflows usable before a sandbox is generated. It should describe expected project shape: project, environment, services, demo secrets, and simulated pipeline history.

Real inventory exists to describe actual infrastructure discovered from providers. It should populate providers, hosts, VMs, containers, sync jobs, capacity, service maps, and runtime visibility.

The product needs an explicit separation rule because the same database currently stores both categories. The acceptable stabilization approaches are source tagging, separate namespaces/tables, or separate database instances, but the product rule is the same: Platform Admin views must be able to exclude seed/demo records deterministically.

### 2. Link `goneops-demo` To Its Runtime Location

`goneops-demo` must be connected to the real place where it runs: the `docker-host` LXC, the `pve` node, and the Proxmox provider. Without this link, the application and infrastructure graphs remain parallel datasets instead of one operational model.

The runtime link should establish a complete chain:

`application -> project -> environment -> service -> runtime asset -> host/node -> provider`

For the current environment, the important runtime asset is the discovered `docker-host` LXC/container record with its Proxmox VMID, node, IP/status, and provider linkage. Once linked, mapping and runtime APIs can return real infrastructure location instead of empty or `not_found` responses.

### 3. Define View Ownership By Data Source

VezClick owns SDLC planning and generation. GoneOps Platform Admin owns runtime visibility. Stabilization must make that ownership visible in the data contract:

- Seed/demo data may support DX sandbox preview, generated files, local service shape, and simulated pipeline scaffolding.
- Discovered inventory must support Platform Overview, Providers, Hosts, VMs, Containers, Capacity, Service Map, Applications, and runtime mapping.
- Sandbox generation may create/update environment runtime metadata, but dashboards consume the normalized backend inventory model, not Proxmox directly.

## Non-Goals

- No new product features.
- No redesign of the application IA or UI.
- No direct Proxmox calls from dashboard pages.
- No expansion of VezClick scope into Platform Admin runtime ownership.
- No use of seed data as a fallback for Platform Admin numbers or runtime location.

## Acceptance Criteria

- Seed/demo records are explicitly identifiable and cannot be counted as real inventory in Platform Admin views.
- `goneops-demo` has an application record linked to project `goneops-demo`.
- The `goneops-demo` dev environment is linked to the discovered runtime location for `docker-host` on the `pve` node under the Proxmox provider.
- `GET /api/inventory/mapping/goneops-demo` returns application, environment, service, runtime asset, host/node, and provider data from discovered inventory.
- `GET /api/projects/1/runtime` returns real runtime rows for the `goneops-demo` services after inventory sync/backfill.
- Platform Admin views use backend API responses backed by normalized inventory tables.
- Frontend dashboards do not call Proxmox APIs directly for overview, capacity, service map, or application runtime views.
- Documentation states which data source populates each view and which role owns it.
