# GoneOps DX Runtime Lifecycle Report

## Before Problem

| Issue | Impact |
|-------|--------|
| Run creates NEW LXC every time | Orphan LXCs accumulate, resource leak |
| No LXC reuse on re-run | cycle-1: Run1→VMID 107, Run2→VMID 108 |
| Docker container name conflict | Re-run fails: "container name already in use" |
| Orphan LXCs from failed runs | 105, 107, 200 left orphaned |

## Fixes Applied

### Phase A: Runtime Idempotency

**Before:** Every Run creates a new LXC via `getNextVmid()`.

**After:** `findExistingRuntime()` checks `runtime_instances` table first. If LXC exists and is running/stopped on PVE, reuse it.

```
Run 1: Creates LXC 110 (go-reuse-v2-dev), status=success
Run 2: Reuses LXC 110 (detected in runtime_instances), status=success
Same VMID: 110 = 110 ✅
```

### Phase B: Container Name Conflict Fix

**Before:** `docker run --name <container>` failed when container already existed

**After:** `docker rm -f <container>` before `docker run`

### Phase C: Orphan Cleanup

Cleaned LXCs not linked to any active project:

| VMID | Name | Reason |
|------|------|--------|
| 105 | go-qa-signoff-dev | Replaced by 106 on re-run |
| 107 | go-cycle-1-dev | Replaced by 108 on re-run |
| 200 | go-sandbox-test | Manual test, never linked |

## Verified State

| Project | VMID | IP | HTTP |
|---------|------|-----|------|
| reuse-v2 | 110 | 192.168.1.193 | 200 ✅ |

```
Run 1: 4×15s → success, VMID=110
Run 2: 2×15s → success, VMID=110 (reused, faster)
HTTP: 200 ✅
```

## Lifecycle Design

```
POST /projects/:id/environments/:envId/run
    │
    ├─ findExistingRuntime()
    │   ├─ Exists + running → reuse, re-deploy
    │   ├─ Exists + stopped → start, re-deploy
    │   ├─ DB exists, PVE missing → marked broken → create new
    │   └─ No existing → create new LXC
    │
    ├─ Get LXC IP (DHCP)
    ├─ Install Docker (idempotent)
    ├─ Deploy containers (docker rm -f + docker run)
    ├─ Health check (docker ps count)
    └─ Update DB (runtime_instances, environments, services)
```

## Remaining Work

| Item | Priority |
|------|----------|
| Destroy endpoint (DELETE LXC + DB records) | Medium |
| Orphan detection API (GET /platform/runtime/orphans) | Medium |
| Dashboard step progress UI (show steps during Run) | Low |
| Run button calls new endpoint (currently uses old /run) | Low |

## Files Changed

| File | Change |
|------|--------|
| `backend/src/sandbox/runtimeOrchestrator.js` | findExistingRuntime(), idempotency fix, docker rm -f |
