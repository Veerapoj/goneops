# Secret Patch SDLC Recovery

## Current State

| Item | Status |
|------|--------|
| Workflow | `wf-20260706-goneops-runtime-v3`, testing FAIL, `waiting_human` |
| Unapproved patch | `runtimeOrchestrator.js` +58 lines, QUARANTINED |
| Secret stored | `PVE_SSH_PRIVATE_KEY` in secrets table, env_id=1 |
| Bypass report | `Docs/CONTEXTOS_BYPASS_AUDIT_REPORT.md` |
| Patch report | `Docs/UNAPPROVED_SECRET_PATCH_REPORT.md` |
| Governance report | `Docs/CONTEXTOS_PERMISSION_GATE_REPORT.md` |

## Recovery Path

### Step 1: Architect Review

Architect (Claude Opus) must review the patch and produce:
`Docs/SECRET_RUNTIME_ARCHITECT_REVIEW.md`

Decision: ACCEPT / REVISE / REJECT

### Step 2: If ACCEPTED

1. Resume workflow: `y` → routes to on_fail (architecture)
2. Architecture evaluates patch → PASS → implementation
3. Developer (sonnet) converts patch to approved implementation
4. Review (gpt-5.5) — MAX 3 rounds only
5. Testing (gpt-5.5) — real runtime test
6. QA (sonnet) — final signoff

### Step 3: If REVISED

1. Architect specifies required changes
2. Developer applies only those changes
3. Same review/testing/QA flow

### Step 4: If REJECTED

1. Revert patch (`git checkout -- runtimeOrchestrator.js`)
2. Architect proposes alternative approach
3. Full SDLC cycle from architecture

## Files Ready for SDLC

| File | Status |
|------|--------|
| `runtimeOrchestrator.js` | QUARANTINED (unstaged diff) |
| `secrets` table row | PVE_SSH_PRIVATE_KEY stored |

No commits since quarantine. All changes reversible.
