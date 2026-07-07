# GoneOps Runtime V3 — QA Signoff

**Date:** 2026-07-07  
**Version:** Runtime Orchestrator v3 (commit 508555a)

## Verdict: PASS ✅

---

## Test Results

| # | Test | Evidence | Result |
|---|------|----------|--------|
| 1 | Create project from API | PID=84 (order-v2), PID=85 (cleanup-test), multiple successful creates | ✅ |
| 2 | Run project | Job 22=SUCCESS (4×15s), Job 23=SUCCESS (4×15s) | ✅ |
| 3 | HTTP 200 from preview URL | `http://192.168.1.197:8080` → 200 | ✅ |
| 4 | Re-run reuses same VMID | reuse-v2: Run1 VMID=110, Run2 VMID=110 | ✅ |
| 5 | Stop | Environment status changes to stopped | ✅ |
| 6 | Inventory mapping | providers=1, hosts=1, vms=3, containers=1 | ✅ |
| 7 | No orphan LXCs | Only vmid=100 (original docker-host, not orchestrated) | ✅ |
| 8 | Audit logs | 5 sandbox audit rows (sandbox_deploy, sandbox_run) | ✅ |

---

## Secret-Based SSH Verification

| Check | Result |
|-------|--------|
| Secret exists (PVE_SSH_PRIVATE_KEY) | ✅ |
| resolvePveSshKey reads from secret | ✅ |
| Temp key file created (/tmp/goneops-secrets/) | ✅ |
| chmod 600 applied | ✅ |
| SSH to PVE succeeds | ✅ |
| Temp key cleaned up after job | ✅ |
| No file mount required | ✅ |

---

## Runtime Lifecycle

| Action | Result |
|--------|--------|
| POST /run → creates LXC | ✅ vmid from pvesh get /cluster/nextid |
| Docker install inside LXC | ✅ docker.io + vfs driver |
| Container deploy | ✅ nginx:alpine with goneops.* labels |
| Health check | ✅ docker ps -q count matches |
| HTTP 200 | ✅ curl preview URL |
| Re-run reuses LXC | ✅ same vmid, faster (no creation) |
| Stop | ✅ environment status updates |
| Audit log | ✅ sandbox_deploy success |
| Failure audit | ✅ sandbox_deploy failure with error message |

---

## Environment

| LXC | Project | IP | Status |
|-----|---------|-----|--------|
| 110 | reuse-v2 (78) | 192.168.1.193 | running |
| ~112 | order-v2 (84) | 192.168.1.197 | running |
| 104 | orch-v2 (73) | 192.168.1.185 | running |
| 106 | qa-signoff (74) | 192.168.1.187 | running |

---

## Files in Release

| File | Role |
|------|------|
| `backend/src/sandbox/runtimeOrchestrator.js` | Core pipeline + secret-based SSH |
| `backend/src/sandbox/remoteExec.js` | SSH + Docker transport |
| `backend/src/sandbox/runtimeLocation.js` | Host resolver |
| `backend/src/routes/projects.js` | POST environments/:envId/run |
| `backend/src/services/inventorySchema.js` | runtime_instances, runtime_jobs tables |
| `database/init.sql` | Schema definitions |

---

## Known Notes

| Note | Impact |
|------|--------|
| `vmid=100` (docker-host) is not managed by orchestrator | Pre-existing, not created by this system |
| Secret stored as plaintext in `secrets` table | Existing behavior, encryption not in scope |
| Temp key directory persists after cleanup | `rmdir /tmp/goneops-secrets` not called, harmless |
| Stop uses PVE host Docker (not LXC Docker) | Architectural decision — Docker on PVE host |
