# Integration Report

**Workflow:** wf-20260705-goneops-production
**Stage:** Implementation
**Date:** 2026-07-06

## Integration Points

### Backend Route Mounting
All new endpoints are properly mounted in Express via `backend/src/app.js`:

| Route | Mounted via | Full URL |
|-------|------------|----------|
| `GET /platform/runtime-health` | `app.use('/api', inventoryRoutes)` | `GET /api/platform/runtime-health` |
| `POST /platform/containers/:id/link` | `app.use('/api', inventoryRoutes)` | `POST /api/platform/containers/:id/link` |
| `GET /platform/audit-logs` | `app.use('/api', inventoryRoutes)` | `GET /api/platform/audit-logs` |
| `GET /platform/containers?unmapped=true` | `app.use('/api', inventoryRoutes)` | `GET /api/platform/containers?unmapped=true` |
| `GET /projects/:id/deployments` | `app.use('/api', projectRoutes)` | `GET /api/projects/:id/deployments` |

### Frontend Route Registration
All new pages are properly registered in `frontend/src/App.jsx` under `<PlatformLayout>`:

| Route | Component | File |
|-------|-----------|------|
| `/platform/explorer` | Explorer | `frontend/src/pages/platform/Explorer.jsx` |
| `/platform/unmapped` | UnmappedAssets | `frontend/src/pages/platform/UnmappedAssets.jsx` |
| `/platform/deployments` | DeploymentTimeline | `frontend/src/pages/platform/DeploymentTimeline.jsx` |

### API Client Bindings
All new frontend functions are defined in `frontend/src/api/client.js`:

| Function | Endpoint Called |
|----------|----------------|
| `fetchInventoryMapping(appName)` | `GET /api/inventory/mapping/:app` |
| `fetchRuntimeHealth()` | `GET /api/platform/runtime-health` |
| `linkContainer(id, appId, envId, svcId)` | `POST /api/platform/containers/:id/link` |
| `fetchUnmappedContainers()` | `GET /api/platform/containers?unmapped=true` |

### Service Layer Integration
New service function in `backend/src/services/inventoryService.js`:

| Function | Dependencies |
|----------|-------------|
| `getRuntimeHealth()` | `query` (db.js), `pctExec` (remoteExec.js), `GONEOPS_DOCKER_HOST_VMID` env |

### Module Exports Verified
- `inventoryService.js:419-431` exports: getDashboardStats, listProviders, listHosts, listVMs, listContainers, listApplications, listCertificates, listSyncJobs, getServiceMap, getCapacity, getPlatformOverview, getRuntimeHealth
- `inventory.js:188` exports: router
- `inventory.js:3-17` imports: query (db.js), all 13 inventoryService functions

### Data Flow Verification

1. **Runtime Health Flow:**
   ```
   Browser -> GET /api/platform/runtime-health
     -> inventory.js handler (line 125)
       -> getRuntimeHealth() (inventoryService.js:325)
         -> DB query: find linked container's lxc_vmid
         -> fallback: process.env.GONEOPS_DOCKER_HOST_VMID
         -> SSH: pctExec(vmid, "docker ps --format json")
         -> Parse NDJSON, cross-ref with DB containers
         -> Return health rows
       -> UPDATE services.status for each matching row
       -> Return JSON response
   ```

2. **Container Link Flow:**
   ```
   Browser -> POST /api/platform/containers/:id/link
     -> inventory.js handler (line 141)
       -> Validate application exists
       -> Validate environment in same project
       -> Validate service in same environment
       -> UPDATE containers SET application_id/env_id/service_id
       -> writeAuditLog('container_link')
       -> Return {linked:true, ...}
   ```

3. **Deployment Traceability Flow:**
   ```
   Browser -> GET /api/projects/:id/deployments?environment_id=X
     -> projects.js handler (line 303)
       -> SELECT d.*, c.*, v.*, h.*, pr.*
          LEFT JOIN environments -> containers (discovered)
          LEFT JOIN vms (discovered)
          LEFT JOIN providers (discovered)
          LEFT JOIN hosts (discovered)
       -> Map result: separate runtime keys per deployment
       -> Return {deployments:[{...runtime:{container,vm,host,provider}}]}
   ```

### Container Runtime Dependency Resolution
- Backend rebuilds require `docker compose build backend && docker compose up -d backend`
- Frontend rebuilds require `docker compose build frontend && docker compose up -d frontend`
- GONEOPS_DOCKER_HOST_VMID=100 configured in docker-compose.yml

### Known Infrastructure Prerequisites
1. SSH key `/home/veenews/.ssh/id_ed25519_pve` must have permissions 0600
2. Proxmox sync must populate discovered containers for runtime-health and container linking
3. Docker-host LXC must be running and accessible via SSH for docker ps

## Verdict: PASS

All integration points verified. Backend routes registered and responding. Frontend pages routing correctly. API client bindings match backend endpoints.
