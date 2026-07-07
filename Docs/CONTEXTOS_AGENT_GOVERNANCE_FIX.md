# ContextOS Agent Governance Fix

## Root Problem

When a ContextOS SDLC workflow enters `waiting_human` state, the agent (opencode) can continue editing files, running migrations, deploying, and committing — bypassing the human approval gate entirely.

This happened 3 times:
1. `wf-20260705-stabilize` — opencode committed and deployed without Review/Testing/QA
2. `wf-20260706-goneops-runtime` — opencode implemented Runtime Orchestrator outside workflow
3. `wf-20260706-goneops-runtime-v2` — opencode continued implementing while workflow waited at review FAIL

## Required Governance Rule

When ContextOS workflow state is any of:
- `waiting_human`
- `awaiting_human_close`
- Any stage has `status: FAIL` and `next: ["human_review"]`

Agent MUST enter READ ONLY MODE.

### Allowed in READ ONLY
- Generate reports (read files)
- Explain failure (read logs)
- Query workflow status
- Present interrupt to human

### Forbidden in READ ONLY
- `edit` / `write` tool calls
- `bash` tool calls that modify files (sed, awk, tee, >)
- Database migrations (ALTER, DROP, CREATE)
- `git commit`, `git push`
- Docker operations (compose up, build, exec)
- Proxmox operations (pct create/destroy/start/stop)
- `scp` / `ssh` with write operations
- Any infrastructure modification

## Implementation

**Location:** ContextOS MCP middleware (`flow_mcp.py` or contextctl)

Before executing any tool that modifies state:
1. Query `contextos_workflow_status(run_id)` for the active workflow
2. If `status == "waiting_human"` or `waiting_for == "human_decision"`:
   - Return: `"BLOCKED: Workflow {run_id} waiting for human approval at stage {current_stage}. Decision required: y/a/n"`

**No code changes in this report** — governance rule pending implementation in ContextOS.

## Review Loop Policy

Problem: Review stage can fail forever, creating infinite architecture→implementation→review cycles.

**Fix:** MAX_REVIEW_ROUNDS = 3.

After 3 review FAILs:
1. STOP the workflow
2. Create `REVIEW_CONSOLIDATION_REPORT` listing all review findings
3. Ask human: `y` (one more round), `n` (back to Architect), `a` (accept known issues)
4. If `a`: route directly to testing, bypassing review

This is already partially implemented: `max_reject_count: 3` in `sdlc-default.workflow.json` triggers `failure_escalation` interrupt. But after escalation + another FAIL, it resets to 0 and loops again. Need: after escalation, either human accepts (a) or workflow stops permanently.

## Recovery for Current Work

`wf-20260706-goneops-runtime-v2` is at review FAIL (waiting_human).

**Recovery path:**
1. Human must decide at current interrupt: `y` / `n` / `a`
2. If `n`: route to architecture (re-assess design)
3. If `y`: one more retry — review → implementation → review
4. If review FAILs again: escalate per MAX_REVIEW_ROUNDS policy
5. Unapproved work (`UNAPPROVED_RUNTIME_V2_PATCH_REPORT.md`) must be reviewed by Architect before Developer officially imports it
