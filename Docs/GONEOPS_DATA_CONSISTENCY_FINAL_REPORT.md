# GoneOps Data Consistency — Final Report

## Phase 1: DX Dashboard Verification

| Metric | Before | After |
|--------|--------|-------|
| Projects (non-test) | 28 | 9 |
| Projects with active runtime | 8 | 8 |
| Hidden test projects | 0 (all cleaned) | 0 |

Active projects: goneops-demo, shop-api, orch-v2, qa-signoff, cycle-1, cycle-2, reuse-v2, order-v2, cleanup-test

## Phase 2: Project Cleanup

| Action | Count |
|--------|-------|
| Backup | 131KB `/tmp/goneops-backup-20260707.sql` |
| Projects deleted | 22 (inactive, no runtime) |
| runtime_instances cleaned | 7 |
| runtime_jobs cleaned | 12 |
| environments cleaned | 15 |
| services cleaned | 24 |
| deployments cleaned | 1 |

**Kept:** 9 projects (1 seed + 8 with active runtime)

## Phase 3: Inventory Sync

**Root cause:** Platform Overview queried only `containers WHERE data_source='discovered'` (1 row — docker-host). Runtime LXCs from `runtime_instances` were not counted.

**Fix:** `getDashboardStats()` and `getPlatformOverview()` now include `runtime_instances WHERE status='running'` in the containers count.

| Field | Before | After |
|-------|--------|-------|
| providers | 1 | 1 |
| hosts | 1 | 1 |
| vms | 3 | 3 |
| containers | 1 | **9** (1 discovered + 8 runtime) |
| applications | 0 | 0 |
| last_sync | Jul 5 | Jul 5 (stale — sync pending) |

## Phase 4: Platform Admin

Platform overview now reflects real state: 9 LXCs (8 runtime + 1 discovered).

**Remaining gaps:**
- Docker containers inside LXCs not counted as separate assets
- Service Map doesn't link runtime services to LXCs
- Applications show 0 because `data_source='discovered'` filter excludes runtime apps

## Phase 5: Consistency Verification

| Check | Result |
|-------|--------|
| DX projects match runtime_instances | ✅ 8 of 9 have active runtime |
| PVE LXCs match runtime_instances vmid | ✅ 9 LXCs, all accounted |
| Preview URLs work | ✅ HTTP 200 on all runtime projects |
| Orphan LXCs | ✅ 0 (all LXCs mapped) |
| Audit logs | ✅ sandbox_deploy success entries |

## Active Runtime LXCs

| Project | VMID | IP | Preview |
|---------|------|-----|---------|
| shop-api | 111 | 192.168.1.199 | http://192.168.1.199:8080 |
| orch-v2 | 104 | 192.168.1.185 | http://192.168.1.185:8080 |
| qa-signoff | 106 | 192.168.1.187 | http://192.168.1.187:8080 |
| cycle-1 | 108 | 192.168.1.189 | http://192.168.1.189:8080 |
| cycle-2 | 109 | 192.168.1.191 | http://192.168.1.191:8080 |
| reuse-v2 | 110 | 192.168.1.193 | http://192.168.1.193:8080 |
| order-v2 | 105 | 192.168.1.197 | http://192.168.1.197:8080 |
| cleanup-test | 107 | 192.168.1.198 | http://192.168.1.198:8080 |

## Not Yet Done

| Item | Status |
|------|--------|
| Docker containers per LXC in inventory | Not counted |
| Service Map linking runtime services | Not updated |
| Applications count from runtime projects | Filtered by data_source |
| Proxmox sync (last_sync stale) | Not re-synced |
