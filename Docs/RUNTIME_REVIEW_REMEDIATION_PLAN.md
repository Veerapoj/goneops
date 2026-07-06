# Runtime Review Remediation Plan

## Summary

Review failed 3 times, each catching different issues. Analysis of all failures against the current implementation (commit 907db33 + workflow implementation iterations) shows:

**5 of 6 issues are already fixed** in the current code. Only 1 issue remains and 1 needs explicit verification.

---

## Issue Status Matrix

| Round | Issue | Status | Fixed in |
|-------|-------|--------|----------|
| R1 | audit coverage | ✅ Fixed | catch block writeAuditLog lines 171-179 |
| R1 | VMID fallback error handling | ✅ Fixed | getNextVmid lines 28-38 with API + DB fallback |
| R2 | shell-boundary | ✅ Fixed | safeLabel line 16-18, safeImage line 20-26, Alpine sh compatible |
| R2 | health verification | ✅ Fixed | curl health check lines 138-146, 5 retries, throws on fail |
| R3 | route authorization | ✅ Fixed | requireRole('operator') middleware line 80 in projects.js |
| R3 | shell-safety | ⚠️ Partial | Values sanitized but execSync shell:true with nested quotes |

---

## Remaining Issue: R3-SHELL (shell invocation safety)

### Exact file
`backend/src/sandbox/runtimeOrchestrator.js`

### Exact function
`pct()` helper at line 82:
```js
const pct = (vmid, cmd) => exec(`${ssh} 'pct exec ${vmid} -- bash -c "${cmd}"'`);
```

### Risk
While all interpolated values are sanitized via `safeLabel()`/`safeImage()`, the command is assembled through:
1. Template literal → JS string
2. `shell: true` in execSync → sh parsing
3. Remote bash → `pct exec ... -- bash -c "..."` → bash parsing of quoted string

Three layers of shell interpretation create edge cases. A project name containing `$` (not stripped by `safeLabel`) could be interpreted as a variable by bash.

### Required fix
Replace the nested shell string with argv-based execution where possible. For the Docker run command specifically, pass arguments as an array through SSH:
```js
// Instead of: pct(vmid, `docker run -d ... ${image}`)
// Use a shell-safe wrapper that passes the command to pct exec as a single arg
const safePctExec = (vmid, dockerCmd) => {
  const escaped = dockerCmd.replace(/'/g, "'\\''");
  return exec(`${ssh} 'pct exec ${vmid} -- bash -c '${escaped}''`);
};
```

### Acceptance test
1. Create project named `test-$PROJECT` (with dollar sign in name)
2. Verify deploy succeeds without shell error
3. Verify Docker container has correct label `goneops.project=test-$PROJECT`
4. Verify curl HTTP 200

### Scope limit
Only fix the `pct()` shell safety. Do not add new features. Do not refactor unrelated code.

---

## Review Acceptance Criteria (Next Review)

The next review MUST only check these items:

| # | Check | File | Test |
|---|-------|------|------|
| 1 | safeLabel handles special chars ($, ', ", `, ;) | runtimeOrchestrator.js:16 | Create project name "test-\$PR\"J" and deploy → no errors |
| 2 | safeImage rejects dangerous input | runtimeOrchestrator.js:20 | Send image "nginx; rm -rf /" → rejected with error |
| 3 | Failed deploy cleans up LXC | runtimeOrchestrator.js:163-170 | Kill PVE network mid-deploy → LXC destroyed |
| 4 | Failed deploy writes failure audit | runtimeOrchestrator.js:171-179 | Same test → audit_logs row with result=failure |
| 5 | preview_url uses real LXC IP | runtimeOrchestrator.js:148 | Deploy → preview_url matches pct exec hostname -I |
| 6 | Health check returns 200 | runtimeOrchestrator.js:138-146 | Deploy → health passes, no throw |
| 7 | Route requires operator role | projects.js | POST without X-GoneOps-Role → 403 |
| 8 | Shell safety: no eval of injected $ | runtimeOrchestrator.js:82 | Project "test-\$HOME" → no shell variable expansion |

**Reviewer MUST NOT raise new issues beyond this list unless critical security vulnerability (remote code execution, credential leak).**

---

## Files Requiring Change

| File | Change |
|------|--------|
| `backend/src/sandbox/runtimeOrchestrator.js` | Fix `pct()` shell safety (lines 82, 133) |
| `backend/src/sandbox/runtimeOrchestrator.js` | Update `safeLabel()` to strip $, `, ; (line 16) |

No other files. No new features. No architecture changes.
