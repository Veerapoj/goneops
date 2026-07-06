# ContextOS Workflow Stuck Report

## Workflow: wf-20260706-goneops-runtime

### State at Time of Investigation

| Field | Value |
|-------|-------|
| Graph state | `planning \| running` |
| Progress lifecycle | `running` |
| Progress stage | `architecture` |
| Progress model | `opus` |
| Progress result_status | `PASS` |
| Worker (pid 1609054) | **DEAD** |
| Agent (pid 1609397) | **DEAD** |
| Checkpoint DB | **not found** (deleted) |
| Stage markers | 1 (`planning: PASS`) |
| Auto-accept | `True` (Goal Mode) |
| Events | 0 (old code before event tracking was deployed) |

### Root Cause Analysis

**What happened:**

1. Planning stage ran and completed (PASS), stage marker written
2. Architecture stage started (opus model, agent:claude-architect)
3. Architecture agent completed (PASS, seen in progress file)
4. **Worker died after stage_node wrote progress but before LangGraph checkpoint was saved**
5. Checkpoint DB was deleted → graph restarted from scratch on resume
6. Goal Mode (a) was set → auto_accept=True

**Why graph shows planning still running:**

The LangGraph checkpoint wasn't written after architecture completed. The graph state still shows `current_stage: planning, status: running` because the last successful checkpoint was at the planning stage transition. The architecture step was executed but the checkpoint (which records the graph state as "architecture completed → implementation running") was never saved.

**Why stages loop on resume:**

When resumed with Goal Mode:
1. Graph loads from last checkpoint → planning completed, architecture about to run
2. Architecture: persistent marker found → PASS immediately (correct behavior)
3. Implementation: oc-deepseek agent starts → times out with "no final message"
4. Implementation FAIL → `on_fail: "architecture"` from workflow definition
5. Architecture: persistent marker still there → PASS again
6. Implementation: starts again → FAIL again → loops forever

This is a **two-layer bug**:
- **Layer 1:** Worker death mid-stage (checkpoint not saved)
- **Layer 2:** Implementation agent always fails → routes to architecture → architecture auto-PASS → infinite loop

### Why Planning Shows "running"

The status output from the CLI reads the LangGraph checkpoint. The checkpoint shows `current_stage: planning, status: running`. This is because:
1. The graph has `auto_accept=True` (set during resume)
2. The last checkpointed state is at `planning → human_review → route_to=architecture`
3. The graph started running architecture but the worker died before `current_stage` was updated to "architecture"
4. The graph checkpoint is stale

### Required Fixes

| Issue | Fix |
|-------|-----|
| Worker dies mid-stage | Persistent stage markers (already implemented in 812a917) survive worker death |
| Architecture→Implementation loop | Implementation agent needs to produce valid output OR max_retries limit |
| Stale checkpoint | On resume, force `current_stage` update from progress file before loading checkpoint |
| Checkpoint DB deleted | Don't delete checkpoint DB on every workflow start (regression from cleanup) |
| Status shows wrong stage | CLI status should read from progress file, not just GraphState |

### Evidence

**Progress file:**
```json
{
  "lifecycle": "running",
  "stage": "architecture",
  "model": "opus",
  "actor_id": "agent:claude-architect",
  "result_status": "PASS",
  "worker_pid": 1609054,
  "agent_pid": 1609397,
  "elapsed_seconds": 23
}
```

**Process check:**
```
Worker 1609054: DEAD (kill -0 returns error)
Agent 1609397: DEAD (kill -0 returns error)
```

**Stage marker:**
```
planning.done: {stage: "planning", status: "PASS"}
```

**Checkpoint DB:**
```
Checkpoints.sqlite: NOT FOUND (deleted at workflow start)
```

### Recommended Recovery Steps

1. Kill the current loop: `pkill -f contextos-flow.*goneops-runtime`
2. Fix the checkpoint deletion (don't delete on every workflow start)
3. Fix the implementation agent so it doesn't always timeout
4. Fix the CLI status to show progress file data
5. Resume from the last completed stage (architecture PASS)
6. Force implementation to produce valid output or fail with clear error
7. Continue through review/testing/qa
