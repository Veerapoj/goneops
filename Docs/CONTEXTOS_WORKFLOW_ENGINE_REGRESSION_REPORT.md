# ContextOS Workflow Engine Regression Report

## Root Cause Summary

Three independent issues, all introduced by Flash (opencode deepseek-v4-flash):

### R1: Checkpoint DB deletion (EXTERNAL — shell scripts)

**Root cause:** Flash ran `rm -f checkpoints.sqlite*` before every workflow start in bash commands. This is NOT a code bug — it's an orchestrator-level cleanup habit that destroys LangGraph state between workflow runs.

**Impact:** Every workflow started fresh with no prior state. Resumes always fail because the checkpoint is gone. Persistent stage markers help but don't restore the full graph state.

**Fix:** Stop deleting checkpoint DB. Only delete when explicitly resetting a broken workflow.

### R2: Architecture→Implementation infinite loop (CODE — stage markers)

**Root cause:** When `execute_stage()` finds a persistent stage completion marker, it returns PASS immediately without running the agent. If the next stage fails and routes to `on_fail` (back to the marked stage), the marker still exists → the stage auto-passes again → the next stage runs → fails → loops forever.

**Flow:**
```
architecture (marker exists) → PASS (auto-recover)
  → implementation → FAIL (deepseek timeout)
    → on_fail: "architecture"
      → architecture (marker still there) → PASS (auto-recover)
        → implementation → FAIL → ... (infinite)
```

**Fix:** When a FAIL routes to an `on_fail` target stage, clear the target stage's completion marker. This way, the re-entered stage actually runs instead of auto-recovering.

**Secondary fix:** Only use stage markers when the progress file shows the worker is DEAD and the stage was in a non-terminal state. Don't recover from markers when the worker is alive (normal re-run).

### R3: Interrupt works but worker dies before reaching it (CODE — worker lifecycle)

**Root cause:** `run_agent()` polls the AI CLI in a `while True` loop. If the worker process (Python) crashes during this loop, `stage_node()` never returns, `human_review()` is never called, and the interrupt is never triggered. The graph state remains "running" forever.

**Evidence:** The interrupt DOES fire when reached — proven by the `__interrupt__` output in workflow responses. The issue is that the worker often dies inside `run_agent()` (deepseek timeout, OOM, crash) before reaching `human_review`.

**Fix:** Make `run_agent()` resilient — if the agent completes but the worker was about to die, the output should be persisted. On resume, the persistent completion marker or orphan agent recovery should provide the result. This is addressed by R2's fix.

### R4: Model bindings wrong for review/testing (CODE — model-bindings.json)

**Root cause:** Flash changed `review` and `testing` models from `gpt-5.5` to `oc-deepseek/deepseek-v4-pro`. DeepSeek often returns "no final message" (empty output), causing these stages to fail. Per SDLC constitution: Code Reviewer = Claude Opus, Integration Tester = Codex GPT-5.5.

**Fix:** Restore review and testing to gpt-5.5.

### R5: y/a/n interrupt appearance (NOT BROKEN — orchestrator oversight)

**Root cause:** The y/a/n interrupt DOES fire correctly. Flash was simply not checking for it — the orchestrator auto-resumed based on seeing "FAIL" in history without presenting the interrupt to the user.

**Evidence:** The `__interrupt__` key appears in workflow status output whenever `human_review` is reached. Example:
```
"__interrupt__": [{"type": "stage_review", "prompt": "Accept stage result? y=accept, a=accept all remaining stages, n=reject", ...}]
```

**No fix needed in code.** The orchestrator must properly handle interrupts.

## Files Changed by Flash (5 commits)

| Commit | File | Change | Risk |
|--------|------|--------|------|
| 220eb4c | contextos_flow.py | Goal Mode semantics in human_review | LOW — correct behavior |
| 812a917 | contextos_flow.py | Persistent stage markers | **HIGH** — causes R2 loop |
| 16b5758 | contextos_flow.py | Required outputs gate (artifact non-empty) | MEDIUM — loosens validation |
| c6e91fb | contextos_flow.py | append_workflow_event() | LOW — additive |
| fdc6d42 | flow_mcp.py | compact_result enrichment | LOW — additive |

| Commit | File | Change | Risk |
|--------|------|--------|------|
| (unstaged) | model-bindings.json | review/testing → oc-deepseek | **HIGH** — wrong models |

## Fixes Required

| ID | Fix | File |
|----|-----|------|
| R1 | Stop deleting checkpoint DB in orchestrator scripts | (orchestrator behavior) |
| R2a | When FAIL routes to on_fail, clear target stage's marker | contextos_flow.py:human_review |
| R2b | Only recover from marker if worker is dead AND agent completed | contextos_flow.py:execute_stage |
| R4 | Restore review→gpt-5.5, testing→gpt-5.5 | model-bindings.json |
| R5 | (no fix needed — interrupt works) | — |

## Regression Tests to Add

1. **y/a/n interrupt test:** Start workflow → verify interrupt prompt appears → accepts "a" → all stages run → final workflow_close prompt appears
2. **Goal Mode doesn't skip QA:** Start with "a" → verify review→testing→qa all execute
3. **FAIL stops Goal Mode:** Start with "a", let implementation fail → verify interrupt fires
4. **Checkpoint survives restart:** Run workflow, kill worker, resume → verify state recovered
5. **No infinite loop:** Implementation fails → on_fail routes to architecture → architecture doesn't auto-pass from marker
6. **workflow_close asks human:** All stages PASS → verify "Goal completed. Accept result?" prompt appears

## Before/After

| Behavior | Before (buggy) | After (fixed) |
|----------|---------------|---------------|
| y/a/n prompt | Interrupt fires but orchestrator doesn't show it | Interrupt fires, orchestrator presents to user |
| Checkpoint | Deleted between runs (R1) | Preserved between runs |
| Architecture→implementation loop | Architecture auto-passes from marker (R2) | Marker cleared on FAIL → architecture actually reruns |
| Goal Mode FAIL | Interrupt fires correctly | Same (no change needed) |
| Goal Mode PASS | Skips interrupt, auto-proceeds | Same (correct behavior) |
| workflow_close | Interrupt fires correctly | Same (correct behavior) |
| Review/Testing models | oc-deepseek (R4) | gpt-5.5 (correct per constitution) |
