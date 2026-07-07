# OpenCode Workflow Mode — Audit & Implementation

## Audit: OpenCode Extension Capability

| Capability | API | Status |
|-----------|-----|--------|
| Custom chat modes (Build/Plan/Workflow) | Not exposed | ❌ NOT SUPPORTED |
| Slash commands (/workflow) | Not exposed | ❌ NOT SUPPORTED |
| UI mode selector | Not exposed | ❌ NOT SUPPORTED |
| Custom tools (`tool()`) | `@opencode-ai/plugin` | ✅ SUPPORTED |
| Tool hooks (`before/after`) | `tool.execute.before` | ✅ SUPPORTED |
| Toast notifications | `client.tui.showToast` | ✅ SUPPORTED |
| Plugin auto-load | `~/.config/opencode/plugins/*.js` | ✅ SUPPORTED |

**Decision:** Phase 2B — custom tools + governance guard.

## Implemented

### Governance Guard (Primary Protection)

`tool.execute.before` hook intercepts write/edit/bash-mutation tools:
- If any workflow in `waiting_human` state → BLOCKS with clear error
- Shows workflow ID and stage, tells user to use `contextos_workflow_resume`

### Workflow Tools

| Tool | Description |
|------|-------------|
| `contextos_workflow_list` | Lists all workflow runs with state |
| `contextos_workflow_status` | Status for one workflow (stage, model, events) |
| `contextos_workflow_resume` | Resume with y/a/n decision |
| `contextos_can_execute` | Programmatic permission check |

### Guard in Action (just proven)

```
User: write file
Plugin: finds wf-20260703-goneops-layout (waiting_human, qa)
Result: BLOCKED - "Use contextos_workflow_resume with y/a/n to continue"
```

### Not Implemented (OpenCode Limitation)

| Feature | Reason |
|---------|--------|
| UI Mode selector | OpenCode binary — no UI extension API |
| Slash commands | Not in plugin API |
| Auto-routing messages | Requires UI mode |

### Setup

Restart OpenCode to load the new plugin alongside the existing `contextos-progress.js`.
