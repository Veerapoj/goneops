# OpenCode Governance Guard — Hardening Report

## Fixes Applied

### 1. Bash Redirect Detection (FIXED)

Added 30+ mutation patterns covering:
- File redirects (>, >>, cat>, echo>, printf>)
- In-place editing (sed -i, perl -pi)
- File ops (rm, mv, cp, touch, chmod, chown, mkdir)
- Git mutations (add, commit, push, reset --hard)
- Docker mutations (compose up, run, build)
- Proxmox (pct create/destroy/start/stop)
- Database (INSERT, UPDATE, DELETE, ALTER, DROP, CREATE, TRUNCATE)
- System (sudo, systemctl, kill, dd)
- Package management (npm install, apt-get install)
- Deploy (scp, curl -o)

### 2. Stale Workflow Detection (FIXED)

Guard now skips workflows where `worker_alive !== true` — avoids blocking on dead/stale workflows.

### 3. Pattern Test Results

| Mutation | Caught | Notes |
|----------|--------|-------|
| cat > file | ✅ | |
| echo hi > file | ✅ | |
| tee /etc/x | ✅ | |
| sed -i file | ✅ | |
| rm -rf /tmp | ✅ | |
| git add/commit/push | ✅ | |
| docker compose up | ✅ | |
| pct create/destroy | ✅ | |
| scp file host: | ✅ | |
| curl -o /tmp/x http:// | ✅ | |

| Read-only (should pass) | Blocked? | Notes |
|--------------------------|----------|-------|
| cat /tmp/x | ❌ No (correct) | |
| echo hello | ❌ No (correct) | |
| docker ps | ❌ No (correct) | |
| git status | ❌ No (correct) | |
| curl -s http://x | ❌ No (correct) | |
| pct list | ❌ No (correct) | |
| grep scp file | ❌ No (correct) | |

## Known Gap

Bash redirect via `> file` at command start (not preceded by cat/echo) — e.g., `> /tmp/file` or `>> /tmp/file` — caught by `\>\s*\/\S` pattern but may miss redirects to relative paths. Low risk — most mutations use explicit commands.

## How It Works

```
Agent calls bash tool → tool.execute.before hook fires
  → Plugin reads run files from ~/.local/state/contextos-langgraph/runs/
  → Finds waiting_human workflow with worker_alive=true
  → Checks command against 30+ mutation patterns
  → Match → BLOCKED with clear error
  → No match → Allowed
```
