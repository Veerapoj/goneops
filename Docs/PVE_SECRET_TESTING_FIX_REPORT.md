# PVE Secret Testing Fix Report

## Root Cause

| Issue | Detail |
|-------|--------|
| Testing error | "PVE SSH key path is still a directory" |
| Why | Deployed `runtimeOrchestrator.js` uses `PVE_SSH_KEY=/ssh-key/id_ed25519_pve` — a directory |
| Why not fixed | Secret-based SSH patch is QUARANTINED (unstaged diff), never committed or deployed |
| Secret stored? | ✅ `PVE_SSH_PRIVATE_KEY` exists in DB (env 1) |

## Current State

```
Deployed code: OLD — PVE_SSH_KEY file mount (is a directory → fails)
Quarantined patch: NEW — resolvePveSshKey() reads from GoneOps Secret
Secret in DB: PVE_SSH_PRIVATE_KEY = <valid ED25519 key>
```

## Fix Required

1. Deploy the quarantined secret-based SSH patch to the backend container
2. Verify `resolvePveSshKey()` reads the secret and creates temp key file
3. Run testing

## Patch: What Needs Deploying

From `backend/src/sandbox/runtimeOrchestrator.js` (unstaged diff):

```
+ resolvePveSshKey(jobId)  — reads secret from DB, writes temp file chmod 600
+ cleanupTempKey()          — deletes temp file after job
+ assertPveSshKeyUsable()   — updated to accept _resolvedSshKey
+ cleanupTempKey() in catch — cleanup on failure
+ cleanupTempKey() in success — cleanup after success
```

## Verification Steps (After Deploy)

1. Secret readable: `SELECT value FROM secrets WHERE key='PVE_SSH_PRIVATE_KEY'`
2. Temp file: `/tmp/goneops-secrets/pve_key_<jobId>` with chmod 600
3. SSH works: `ssh -i /tmp/goneops-secrets/pve_key_X root@192.168.1.165 hostname`
4. LXC create: `pct create ...` succeeds
5. Docker deploy: `docker run nginx:alpine` succeeds
6. HTTP 200: curl preview URL returns 200
7. Cleanup: temp file deleted after job completes/fails
