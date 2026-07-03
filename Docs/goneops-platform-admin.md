You are a Principal Platform Architect and Enterprise DevOps Architect.

Your task is to design and plan the next major module for an existing product called GoneOps.

Current product status:

GoneOps already has:

1. GoneOps DX Layer
Purpose:
Developer Experience Platform

Existing features:
- Project dashboard
- Environment management
- Service selection
- Sandbox runtime concept
- CI/CD workflow
- Deployment workflow
- Live application preview
- README generator
- Runtime service view

Current flow:

Developer
 → Create Project
 → Select Stack
 → Generate Runtime
 → Build
 → Deploy
 → Test


New requirement:

Design and implement a new module:

"GoneOps Inventory Platform"

This is NOT an infrastructure provisioning platform.

Important:
Do NOT build another Terraform, Proxmox, VMware, or Cloud provisioning tool.

The main goal is:

"Discover existing infrastructure, connect it with applications, and provide complete runtime visibility."

Enterprise problem:

Companies already have:
- Bare metal servers
- Virtual machines
- Proxmox
- VMware
- Kubernetes
- Docker hosts
- Cloud resources

But they do not know clearly:

- What application runs where?
- Who owns it?
- Which environment?
- Which VM?
- Which container?
- Which database?
- Which dependencies?
- What version?
- What risk?

GoneOps Inventory solves this.


================================
HIGH LEVEL ARCHITECTURE
================================

Design these layers:

1. Connector Layer

Responsible for collecting data.

Support:

Phase 1:
- Docker Host
- Linux SSH Discovery
- Proxmox API

Future:
- Kubernetes API
- VMware vCenter
- AWS
- GCP
- Azure


2. Discovery Engine

Responsibilities:

Discover:

Host:
- hostname
- IP
- OS
- kernel
- uptime
- CPU
- memory
- disk

Runtime:
- Docker containers
- images
- ports
- volumes
- environment variables

Applications:
- running services
- processes
- exposed ports

Database:
- PostgreSQL
- MySQL
- Redis
- RabbitMQ

Network:
- IP
- DNS
- ports
- certificates


3. Inventory Database

Create data model for:

- providers
- hosts
- virtual_machines
- containers
- applications
- services
- environments
- databases
- storage
- networks
- certificates
- ownership
- dependencies
- lifecycle
- sync_jobs


4. Application Mapping Engine

Most important feature.

Map:

Application

 ↓

Environment

 ↓

Service

 ↓

Runtime

 ↓

Container / Process

 ↓

VM / Host

 ↓

Provider


Example:

Payment System

 PROD

  payment-api

    docker container

       vm-app01

          Proxmox Node01


5. Ownership / CMDB Layer

Add:

Application Owner
Team
Business Unit
Contact
SLA Level
Critical Level
Cost Center


6. Lifecycle Management

Track:

OS version
OS EOL
Runtime version
Runtime EOL
Patch status
Certificate expiry
Warranty expiry


7. Capacity Management

Show:

CPU allocation
CPU usage
Memory allocation
Memory usage
Storage usage

Detect:

- idle VM
- unused resources
- over provisioning
- capacity risk


8. Dependency Mapping

Build dependency graph:

Frontend

 ↓

API

 ↓

Database

 ↓

Redis

 ↓

External API


9. Environment Compare

Compare:

DEV
UAT
PROD

Detect drift:

Example:

API Version

DEV: 1.5
UAT: 1.5
PROD: 1.4 WARNING


Database Version

DEV PostgreSQL 15
PROD PostgreSQL 13 WARNING


10. Change Timeline

Track:

Deployment changes
Infrastructure changes
Configuration changes
Service changes


11. Backup Visibility

Show:

Backup enabled
Last backup
Backup status
Restore test date


12. Certificate Inventory

Track:

Domain
SSL expiry
Owner
Mapped application


================================
INTEGRATION WITH EXISTING GONEOPS
================================

Connect Inventory Platform with GoneOps DX.

Existing DX:

Project
Environment
Service
Deployment


Inventory must enrich it:


Project

    |
    
Environment

    |
    
Runtime Service

    |

Actual Infrastructure


Example:


GoneOps DX:

Project:
Payment


Environment:
Production


Inventory:

payment-api

running on:

container id abc123

host:

vm-prod01

provider:

Proxmox Cluster A


================================
USER ROLES
================================

Developer View:

Can see:
- Own project
- Runtime location
- Logs
- Deployment
- Service status


Platform Admin View:

Can see:
- All infrastructure
- All applications
- All ownership
- Capacity
- Lifecycle


================================
UI REQUIREMENTS
================================

Extend existing GoneOps UI.

Add Platform Admin section.

Sidebar:


PLATFORM

Overview


Discovery

- Providers
- Agents
- Sync Jobs


Inventory

- Applications
- Hosts
- Virtual Machines
- Containers
- Network
- Storage


Mapping

- Service Map
- Dependency Map
- Environment Compare


Operations

- Deployments
- Images
- Backup
- Certificates


Governance

- Ownership
- Lifecycle
- Audit Logs


================================
IMPLEMENTATION PHASE
================================


PHASE 1:
Inventory Foundation

Goal:
Read-only visibility first.

Build:

- Database schema
- Provider connector framework
- Docker discovery
- Linux SSH discovery
- Proxmox discovery
- Sync job system
- Host inventory
- Container inventory
- Basic dashboard


NO provisioning.


PHASE 2:
Application Intelligence

Build:

- Application mapping
- Environment mapping
- Service dependency
- Ownership
- CMDB


PHASE 3:
Operational Intelligence

Build:

- Lifecycle tracking
- Version tracking
- Certificate tracking
- Backup visibility
- Change timeline


PHASE 4:
Optimization

Build:

- Capacity analytics
- Idle resource detection
- Cost estimation
- Resource recommendation


PHASE 5:
Automation

Only after visibility is stable.

Add:

- Restart service
- Execute job
- Patch workflow
- Provision VM
- Scale service


================================
ARCHITECT TASK
================================

Before coding:

Create:

1. System Architecture Diagram
2. Database ER Diagram
3. API Design
4. Service Boundary
5. Connector Plugin Architecture
6. Integration plan with existing GoneOps DX
7. Development task breakdown
8. Testing strategy


Rules:

- Do not duplicate existing GoneOps DX features
- Do not build monitoring features belonging to System Doctor
- Do not build AI SDLC features belonging to VezClick
- Focus only on Inventory, Mapping, Visibility, and Platform Operations

Think like:
- Platform Engineer
- SRE Manager
- Enterprise Architect

The goal:

"One place to know every application, where it runs, who owns it, and what it depends on."