# OpenCode Workflow Mode + Governance Guard

## Problem

OpenCode agents (deepseek-v4-flash) could bypass ContextOS SDLC by directly editing files during `waiting_human` state. This happened 4+ times across multiple workflows.

## Solution

### 1. ContextOS Governance Plugin

**File:** `~/.config/opencode/plugins/contextos-governance.js`

Intercepts write/edit/bash tools via OpenCode plugin hooks:

- `tool.execute.before` — checks if there's an active workflow in `waiting_human` state
- If YES: blocks the tool with clear error message
- Also exposes `contextos_can_execute` tool for programmatic checking

**Blocked tools:**
- `write` — file creation
- `edit` — file modification
- `bash` — shell commands containing mutations (sudo, docker, pct, git, SQL DDL)
- `git_commit`, `git_push`
- `deploy`

**Allowed in waiting_human:**
- `read` — file reading
- `grep` — search
- `glob` — file listing
- Reporting tools

### 2. Enforcement Points

| State | Write/Edit | Read/Report | Bash (mutations) | Bash (read-only) |
|-------|-----------|-------------|-----------------|-----------------|
| `waiting_human` | ❌ BLOCKED | ✅ | ❌ BLOCKED | ✅ |
| `running` (developer) | ✅ | ✅ | ✅ | ✅ |
| `running` (architect) | ❌ | ✅ | ❌ | ✅ |

### 3. Workflow Mode Concept

OpenCode is a compiled binary — cannot modify its UI directly. But the plugin provides equivalent behavior:

- When any `waiting_human` workflow exists, all mutation tools are auto-blocked
- No mode selector needed — the guard is automatic
- The plugin checks ALL run files in the runs directory

### 4. Setup

To enable, ensure the plugin is loaded in OpenCode's plugin config. The plugin auto-discovers active workflows from `~/.local/state/contextos-langgraph/runs/`.

### 5. Test

**Before (no guard):**
```
User: "fix terminal.js"
Agent edits file while workflow is waiting_human
File changed ✓ (violation)
```

**After (with guard):**
```
User: "fix terminal.js"
Agent: "BLOCKED: Workflow wf-xxx waiting for human at stage review.
       Resume with y/a/n before modifying files."
File NOT changed ✓
```
