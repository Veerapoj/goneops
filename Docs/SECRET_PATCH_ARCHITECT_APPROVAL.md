# Secret Patch Architect Approval

## Decision: ACCEPT WITH LIMITED SCOPE

**Patch:** Secret-based PVE SSH credential for Runtime Orchestrator  
**Source:** `Docs/UNAPPROVED_SECRET_PATCH_REPORT.md`  
**Reviewer:** Solution Architect (human-directed)

---

## Scope Lock

Only these functions are approved for deployment:

| Function | Purpose | Approved |
|----------|---------|----------|
| `resolvePveSshKey(jobId)` | Read PVE_SSH_PRIVATE_KEY from secrets, write temp file chmod 600 | ✅ |
| `cleanupTempKey()` | Delete temp key file after job completes | ✅ |
| `assertPveSshKeyUsable()` (updated) | Accept _resolvedSshKey or PVE_SSH_KEY file | ✅ |
| Catch block cleanup call | `cleanupTempKey()` on failure | ✅ |
| Success path cleanup call | `cleanupTempKey()` after success | ✅ |

NOT approved:
- No runtime redesign
- No LXC logic changes
- No Proxmox provisioning changes
- No new features
- No secret management UI

---

## Security Assessment

| Check | Finding |
|-------|---------|
| Private key encrypted at rest | ⚠️ Stored as plaintext in secrets table (existing behavior) |
| Decrypted only during execution | ✅ Read from DB only in resolvePveSshKey() |
| Never returned to frontend | ✅ Internal function, no API exposure |
| Never logged | ⚠️ No explicit logging guard — value could appear in error traces |
| Temp file permissions | ✅ chmod 0o600 |
| Temp file deleted after success | ✅ cleanupTempKey() called |
| Temp file deleted after failure | ✅ cleanupTempKey() in catch block |
| Fallback to file mount | ✅ Preserved |
| Multi-provider future | ✅ Secret namespaced by key name (PVE_*) |

---

## Acceptance Criteria for Testing

| # | Test | Expected |
|---|------|----------|
| 1 | Deploy backend with patch | Container starts |
| 2 | Secret readable | resolvePveSshKey() returns valid path |
| 3 | Temp file created | /tmp/goneops-secrets/pve_key_X exists, chmod 600 |
| 4 | SSH to PVE | `ssh -i <temp> root@192.168.1.165 hostname` returns `pve` |
| 5 | POST /run creates LXC | LXC appears on PVE |
| 6 | Docker container runs | nginx inside LXC, HTTP 200 |
| 7 | Temp file deleted | After job success: temp file gone |
| 8 | Audit log | sandbox_deploy success entry |
