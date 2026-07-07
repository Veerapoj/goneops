# ContextOS Permission Gate Report

## Problem

Agent bypassed SDLC workflow 3 times by editing files after `waiting_human` state was reached.

## Solution: Pre-execution Permission Gate

Before any mutation action (write/edit/shell/commit/deploy), the orchestrator must check:

```
contextos_can_execute(workflow_id, agent_id, role, action) → {allowed, reason}
```

## State Rules

| Workflow State | Read Files | Create Reports | Edit Code | Shell Mutation | DB Change | Deploy | Commit |
|---------------|-----------|---------------|-----------|---------------|-----------|--------|--------|
| `waiting_human` | ✅ | ✅ | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY |
| `awaiting_human_close` | ✅ | ✅ | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY |
| `review` + `FAIL` | ✅ | ✅ | ⚠️ Developer only* | ⚠️ Developer only* | ⚠️ Developer only* | ❌ DENY | ⚠️ only assigned task |
| Any `FAIL` (not review) | ✅ | ✅ | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY |
| `running` (Designated Developer) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ unless testing | ⚠️ after review |
| `complete` | ✅ | ✅ | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY |

*Developer only: agent role must match Developer in model-bindings. Architect/Tester/QA cannot mutate during review.

## Rejection Response

```json
{
  "allowed": false,
  "reason": "Workflow wf-xxx is waiting for human approval at stage review",
  "workflow_state": "waiting_human",
  "required_action": "Human must resume with y/a/n decision"
}
```

## Agent Action Audit

Every mutation attempt must record:

```
{
  "agent": "opencode/deepseek-v4-flash",
  "role": "Developer",
  "workflow_id": "wf-xxx",
  "action": "write_file",
  "timestamp": 1783360000,
  "allowed": false,
  "reason": "waiting_human"
}
```

Store in: `~/.local/state/contextos-langgraph/audit/agent_actions.json`

## Implementation

**Location:** ContextOS flow_mcp.py — `call_tool()` wrapper or contextctl middleware.

**Pseudocode:**
```python
def guard(workflow_id, action):
    progress = read_progress(workflow_id)
    lifecycle = progress.get("lifecycle")
    stage = progress.get("stage")
    status = progress.get("result_status")

    if lifecycle == "waiting-human" or lifecycle == "awaiting-human-close":
        return deny("workflow waiting for human approval")

    if status == "FAIL" and stage == "review":
        return deny("developer must wait for human decision")

    if status == "FAIL":
        return deny("stage failed, awaiting human decision")

    return allow()
```

## Bypass History (for audit trail)

| # | Workflow | State | Action Taken | Agent |
|---|----------|-------|-------------|-------|
| 1 | `wf-20260705-stabilize` | waiting_human | commit + deploy | opencode |
| 2 | `wf-20260706-goneops-runtime` | planning running | full implementation | opencode |
| 3 | `wf-20260706-goneops-runtime-v2` | review FAIL | 6 fixes outside SDLC | opencode |
| 4 | `wf-20260706-goneops-runtime-v3` | testing FAIL | secret-based SSH | opencode |
