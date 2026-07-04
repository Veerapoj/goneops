# GoneOps Proxmox Manager

## Overview
A separate service that integrates with GoneOps Inventory Platform. Manages Proxmox infrastructure for lab/admin use while keeping GoneOps Inventory read-only and safe.

## Stack
- Backend: Node.js + Express
- Frontend: React + TailwindCSS
- Database: PostgreSQL
- Proxmox API integration
- Docker Compose

## Core Requirements
1. Add Proxmox provider connection
2. Store Proxmox API URL and API token securely
3. Test Proxmox connection
4. List Proxmox nodes
5. List VMs and LXC containers
6. View VM detail
7. Start VM
8. Stop VM
9. Reboot VM
10. Clone VM from template
11. Create snapshot
12. Rollback snapshot
13. Track Proxmox task UPID status
14. Write audit log for every action
15. Sync VM/node data back to GoneOps Inventory

## Safety Requirements
- Default mode must be read-only
- Write actions require explicit confirmation
- Delete VM must NOT be implemented in MVP
- All actions must create audit logs
- All Proxmox API errors must be shown clearly
- All long-running actions must use async task tracking
- Never expose API token in UI or logs

## UI Pages
- Proxmox Providers
- Nodes
- Virtual Machines
- Templates
- Snapshots
- Tasks
- Audit Logs

## API Endpoints
- POST /api/proxmox/providers
- POST /api/proxmox/providers/:id/test
- GET /api/proxmox/providers/:id/nodes
- GET /api/proxmox/providers/:id/vms
- GET /api/proxmox/vms/:id
- POST /api/proxmox/vms/:id/start
- POST /api/proxmox/vms/:id/stop
- POST /api/proxmox/vms/:id/reboot
- POST /api/proxmox/vms/:id/snapshot
- POST /api/proxmox/vms/:id/rollback
- POST /api/proxmox/templates/:id/clone
- GET /api/proxmox/tasks/:upid
- POST /api/proxmox/sync-inventory

## Implementation Phases
- Phase 1: Provider connection, read-only node/vm/lxc discovery, sync to Inventory
- Phase 2: Start/Stop/Reboot, Proxmox task tracking, audit logs
- Phase 3: Clone from template, snapshot/rollback
- Phase 4: RBAC, approval workflow, quota

## Target
- Host: 192.168.1.165
- Proxmox user: root / Un1x@dm1n
- New service user: GoneOps

## Rules
- Do not mix this service into the Inventory core
- Inventory remains read-only
- Proxmox Manager can write to Proxmox only through controlled admin actions
