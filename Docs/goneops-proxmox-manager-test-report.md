# GoneOps Proxmox Manager Test Report

Stage: testing
Date: 2026-07-04T11:59:40Z
Status: FAIL

## Automated Validation

- Backend syntax validation: PASS (`npm run test:syntax` in `backend`; all `backend/src/**/*.js` files passed `node --check`).
- Frontend production build: PASS (`npm run build` in `frontend`; Vite built 1,655 modules successfully).
- Docker Compose configuration validation: PASS (`docker compose -f docker-compose.yml -f test-compose.override.yml config -q`).
- Live stack health probes: PASS (`GET http://localhost:14000/api/health` returned HTTP 200; `GET http://localhost:13000/` returned HTTP 200).
- Proxmox RBAC probe, default viewer write: PASS (`POST /api/proxmox/vms/100/start` without role returned HTTP 403).
- Proxmox RBAC probe, operator validation path: PASS (`POST /api/proxmox/vms/100/start` with `X-GoneOps-Role: operator` and missing `provider_id` returned HTTP 400 validation error).
- Proxmox approvals read probe: PASS (`GET /api/proxmox/approvals` returned HTTP 200).
- Proxmox approval admin gate probe: PASS (`POST /api/proxmox/approvals/1/approve` with operator role returned HTTP 403).
- Full-stack backend smoke suite: FAIL (`GONEOPS_API_URL=http://localhost:14000/api GONEOPS_FRONTEND_URL=http://localhost:13000 npm run test:smoke` passed 9 checks, then failed at sandbox startup with `Sandbox entered failed state`).

## Proxmox Phase 2-4 Assertions

- Required backend endpoints are present for VM start/stop/reboot, snapshot, rollback, template clone, task polling, template listing, snapshot listing, task listing, approvals listing, approval approve, and approval reject.
- Backend schema additions are present for `proxmox_tasks`, `approval_requests`, and `quota_max_vms`.
- Backend client/service symbols are present for start/stop/reboot, task status, clone, snapshot create/list, rollback, approval, task listing, RBAC, and quota-related logic.
- Frontend routes and nav entries are present for Templates, Snapshots, and Tasks.
- Frontend Proxmox pages are present at `frontend/src/pages/platform/proxmox/Templates.jsx`, `Snapshots.jsx`, and `Tasks.jsx`.
- Frontend API client exports the expected Proxmox Phase 2-4 functions and sends `X-GoneOps-Role` headers for mutating/approval actions.
- The prohibited delete-VM/delete-snapshot scan found no Proxmox delete handlers. Matches were limited to unrelated project secret deletion and request/socket teardown code.

## Failure Detail

The smoke failure occurred outside the Proxmox Manager feature surface. The smoke suite reached the sandbox lifecycle check after passing backend health, seeded project, frontend route fallback, project/environment creation, cross-project rejection, sandbox generation, file traversal blocking, secrets masking, and database credential masking. The sandbox runner marked the generated sandbox failed while Docker Compose was still starting the generated web container; the failure cleanup then stopped the sandbox. Backend logs showed the generated Compose operation progressing through dependency health checks and web container start before cleanup.

## Raw Log Reference

Raw command output and probes are captured in this report and the local command history for this testing stage.
