# GoneOps Sandbox → Proxmox LXC Architecture Decision

Workflow: wf-20260705-goneops-audit · Stage: architecture · Date: 2026-07-05

## 1. Audit baseline (Goal 1 / M1)

A widened literal grep across all of `frontend/src/pages/**` (App DX pages + `platform/**`
+ `platform/proxmox/**`) for the audited patterns
(`430`, `640 Core`, `4 TB`, `100 TB`, `app01`, `cache01`, `db01`, `docker-01`,
`PostgreSQL`, `Success`, `Failed`, `proxmox-`, `Available in Phase`) returned
**zero mock/hardcoded violations**. The only survivors are legitimate labels:

- `Databases.jsx:42` — "PostgreSQL connection successful/failed" is a live connection-test message.
- `Overview.jsx:15,428` — "PostgreSQL / MySQL" DB-type description; DB name derived from real `activeEnv`.
- `platform/proxmox/Providers.jsx:240` — "Connected/Failed" badge driven by live `testResult.result`.

Decision: **no frontend edits required** for the audit goal; record this negative result as
the audit baseline. Implementation must re-run the same grep as a regression gate (M9).

## 2. Sandbox topology decision (M2)

**Chosen: one LXC per sandbox environment running the existing unmodified
`docker-compose.yml` via nested Docker.**

Rationale:
- Preserves the `goneops_net` external network + per-prefix DNS-alias model that
  `runner.js testApi()` and inter-service addressing depend on — the four-discrete-LXC
  option breaks the DNS-alias model and needs a net-new networking design.
- Reuses the generated compose project verbatim, keeping the local template files as the
  single source of truth that the file browser and `05-sandbox-files.spec.js` require.
- Minimal rewrite surface: only the *execution transport* changes (local exec → remote exec),
  not the generated artifacts.

Constraint: the LXC must be **privileged OR unprivileged with `nesting=1,keyctl=1`
features** (`createLXC` config `features: 'nesting=1,keyctl=1'`) so nested Docker runs.
This is a Proxmox host-side capability; if the host/template lacks it, `docker compose up`
inside the LXC fails and must surface as an operational error, not a code fault.

## 3. Data-model change (M3)

`environments` table has no infrastructure linkage columns today. Add a migration
(in `inventorySchema.js`/`ensureInventorySchema` AND `database/init.sql`) adding nullable:
`lxc_vmid INTEGER`, `lxc_node VARCHAR(64)`, `lxc_provider_id INTEGER`,
`lxc_ip VARCHAR(64)`, `lxc_status VARCHAR(32)`. These persist the provisioned target so
run/stop/restart/logs/terminal resolve the correct remote LXC without re-provisioning.

`generateSandbox()` keeps rendering local template files first (unchanged), then — after
the file write — provisions the LXC using the existing
`getNextId` → `createLXC` → `insertTask` → `writeAuditLog` pattern (mirroring
`provisionInfrastructure` at `proxmoxService.js:799`), and writes the vmid/node/provider_id/ip
onto the environment row. Provisioning is idempotent: reuse an existing `lxc_vmid` if present.

## 4. Remote-execution transport (M4/M5/M6)

The Proxmox REST API can create the LXC shell but **cannot** install Docker, copy the
compose project in, or run compose lifecycle commands. Introduce a remote-exec module
`backend/src/sandbox/remoteExec.js` using an **SSH client (`ssh2`, new dependency)** that
connects to the Proxmox host and runs `pct exec <vmid> -- <cmd>` (avoids needing per-LXC
SSH credentials; reuses host root SSH already required for PVE administration). Config via
env: `PVE_SSH_HOST`, `PVE_SSH_USER`, `PVE_SSH_KEY`/`PVE_SSH_PASSWORD`.

Rewrites:
- **`runner.js`**: `preflightCheck` → check Proxmox provider + host SSH reachability
  (replace the "Docker daemon is unavailable" 503 with a "Proxmox LXC/provider unreachable"
  503). `runSandbox`/`stopSandbox`/`restartSandbox`/`getSandboxLogs` run the same
  `docker compose …` commands **inside the LXC** via `pct exec`, with a one-time bootstrap
  (install Docker + push the compose project) on first run.
- **`terminal.js`**: replace local `spawn('docker', ['compose','exec','-T','web','sh'])`
  with `spawn('ssh', … 'pct exec <vmid> -- docker compose exec -T web sh')`, preserving the
  WebSocket UX; the compose-file existence check moves to a remote check.
- **`ports.js` + preview_url**: allocated host ports must resolve against the **LXC's IP**
  (`lxc_ip`), not `PUBLIC_HOST`. Preview URL becomes `http://<lxc_ip>:<webPort>`. Port
  allocation stays DB-driven (advisory-lock model unchanged) but is now per-LXC, so global
  uniqueness across the shared host still holds. `testApi()`'s `${prefix}_web` DNS host stays
  valid because it now resolves via `pct exec` inside the LXC's Docker network.

## 5. RBAC / lifecycle guardrails (M7)

`POST /api/projects/:id/generate-sandbox`, `/run`, `/restart` now create/consume real
Proxmox resources on a shared host. Decision:
- Gate `generate-sandbox`, `run`, and `restart` behind `requireRole('operator')`
  (reuse the existing header/localStorage RBAC convention; consistent with the standing
  "no general-purpose create-VM HTTP API" constraint — this is a scoped sandbox provisioner,
  not a general VM API).
- Enforce a **per-project sandbox quota** and a **stale-sandbox reaper** (TTL on `updated_at`,
  destroy LXC via existing `deleteLXC` + audit log) so abandoned sandboxes don't accumulate.
- Every provision/destroy writes an `audit_logs` row (reuse `writeAuditLog`).

## 6. E2E loop (M8/M9)

- Update `tests/e2e/specs/05-sandbox-files.spec.js` to keep the local-file assertions AND
  assert the lifecycle produced a real LXC visible via `/api/platform/*` or `/api/proxmox/*`.
- Run `09-proxmox-manager.spec.js` as a regression guard.
- Final gate: literal-grep clean across all frontend pages, live dashboard/platform data
  checks pass, full Playwright suite (01–09) green via Chrome DevTools against a live deploy.
- All live steps require LAN reachability to the Proxmox host; if unreachable in the
  implementation/testing sandbox, report as a connectivity limitation, not a code failure.

## 7. On-fail

Per the workflow graph, architecture on_fail routes to planning; implementation/review/testing
on_fail route back to architecture.
