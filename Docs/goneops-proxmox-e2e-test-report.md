# GoneOps Proxmox Manager E2E Test Report

Date: 2026-07-04T14:39:28Z

Stage: testing

Targets:
- Frontend: http://192.168.1.147:3000
- Backend: http://192.168.1.147:4000/api/proxmox
- Proxmox: 192.168.1.165:8006
- Provider: id=1
- Lifecycle test VM: vmid 100 only

Raw logs:
- test-results/proxmox-e2e-frontend.log
- test-results/proxmox-e2e-backend.log

## Summary

PASS. Full E2E validation completed against the live 192.168.1.147 stack. The prior localhost 13000/14000 run was not used as evidence.

Total: 39 passed, 0 failed, 0 warnings.

## Results By Area

| Area | Passed | Failed | Notes |
| --- | ---: | ---: | --- |
| Frontend pages | 8 | 0 | Platform Admin plus Providers, Nodes, VMs, Templates, Snapshots, Tasks, Audit Logs rendered via Playwright. |
| Backend API checks | 11 | 0 | Health, providers, test connection, nodes, VMs, VM detail, snapshots, templates, tasks, approvals, audit logs. |
| RBAC probes | 8 | 0 | No-role/viewer mutating requests returned 403. Operator/admin role paths passed where expected. |
| VM lifecycle | 5 | 0 | VM 100 start returned UPID, task polled terminal, stop returned UPID, task polled terminal, VM restored to stopped. |
| Approval flow | 4 | 0 | Operator rollback and clone returned 202 pending; pending approval listed; admin reject succeeded and persisted. |
| Audit/inventory assertions | 3 | 0 | Audit logs listed and grew; inventory returned exactly 1 node and 6 VMs: 1 qemu, 5 lxc. |

## Frontend

Command:

```bash
cd tests/e2e
GONEOPS_BASE_URL=http://192.168.1.147:3000 ./node_modules/.bin/playwright test -c playwright.proxmox.config.js
```

Result:

```text
8 passed (57.0s)
```

Pages verified:
- /platform
- /platform/proxmox/providers
- /platform/proxmox/nodes
- /platform/proxmox/vms
- /platform/proxmox/templates
- /platform/proxmox/snapshots
- /platform/proxmox/tasks
- /platform/proxmox/audit-logs

## Backend

Command:

```bash
GONEOPS_API_URL=http://192.168.1.147:4000/api/proxmox node backend/test/proxmox-e2e.js
```

Result:

```text
RESULT 31 passed, 0 failed, 0 warnings
```

Inventory verified:
- Nodes: 1, pve
- VMs: 6 total
- Type split: 1 qemu, 5 lxc
- Expected VMIDs observed: 100, 200, 201, 202, 203, 204

Control verified:
- VM 100 started with operator role.
- Start task UPID was polled to terminal status.
- VM 100 stopped with operator role.
- Stop task UPID was polled to terminal status.
- VM 100 was confirmed stopped after the lifecycle test.

RBAC note: RBAC is the current lab header mechanism using `X-GoneOps-Role`. This test verifies the implemented middleware behavior, not an external identity provider boundary.

## Conclusion

PASS. GoneOps Proxmox Manager Phases 1-4 satisfy the testing-stage acceptance criteria: all required frontend pages render, backend endpoints respond, RBAC gates block viewer/no-role mutating requests, all 6 Proxmox instances are discovered, and VM 100 is controllable with task polling and audit evidence.
