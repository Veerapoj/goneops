# GoneOps MVP E2E Test Cases

Base UI: `http://localhost:13000`  
API through UI proxy: `http://localhost:13000/api`  
Direct backend: `http://localhost:14000/api`

The suite creates a unique project and `dev` environment, generates a real sandbox, and seeds a real pipeline run. Tests execute serially to prevent shared environment races.

| ID | Area | Test case | Expected result |
|---|---|---|---|
| GO-E2E-001 | API health | GET `/api/health` | HTTP 200 with `status=ok`, timestamp, and positive uptime |
| GO-E2E-002 | Navigation | Sidebar displays Overview | Link opens `/` and Overview heading |
| GO-E2E-003 | Navigation | Sidebar displays Environments | Link opens `/environments` |
| GO-E2E-004 | Navigation | Sidebar displays Services | Link opens `/services` |
| GO-E2E-005 | Navigation | Sidebar displays Databases | Link opens `/databases` |
| GO-E2E-006 | Navigation | Sidebar displays Secrets | Link opens `/secrets` |
| GO-E2E-007 | Navigation | Sidebar displays Settings | Link opens `/settings` |
| GO-E2E-008 | Navigation | Sidebar displays Pipelines | Link opens `/pipelines` |
| GO-E2E-009 | Navigation | Sidebar displays Deployments | Link opens `/deployments` |
| GO-E2E-010 | Navigation | Sidebar displays Sandbox | Link opens `/sandbox` |
| GO-E2E-011 | Navigation | Sidebar displays File Browser | Link opens `/files` |
| GO-E2E-012 | Navigation | Sidebar displays Terminal | Link opens `/terminal` |
| GO-E2E-013 | Navigation | Sidebar displays Logs | Link opens `/logs` and Container Logs page |
| GO-E2E-014 | Overview | Reference shell dimensions and colors | 268px dark-blue sidebar and 72px top bar |
| GO-E2E-015 | Overview | Summary cards | Environment, Status, and Preview URL are visible |
| GO-E2E-016 | Overview | Main reference panels | Service Types, Runtime Services, pipeline, Live App, README, Project Info, Quick Actions visible |
| GO-E2E-017 | Overview | Runtime services | Node.js, PostgreSQL, Redis, RabbitMQ services visible |
| GO-E2E-018 | Projects | Create project | HTTP 201 and returned name matches |
| GO-E2E-019 | Projects | List/read project | Created project appears in list and detail endpoint |
| GO-E2E-020 | Projects | Validation/conflict | Missing name returns 400; duplicate name returns 409 |
| GO-E2E-021 | Environments | Create environment in UI | POST succeeds and new environment card appears |
| GO-E2E-022 | Sandbox | Generate sandbox in UI | API succeeds and UI displays result |
| GO-E2E-023 | Sandbox | Naming convention | Generated DB name follows `<project>_<env>_db` |
| GO-E2E-024 | Sandbox | Generated files | README, package, Docker, Compose, env, and source files returned |
| GO-E2E-025 | Sandbox | Runtime metadata | runtime, database, cache, and queue services persisted |
| GO-E2E-026 | File Browser | Required files visible | Required root files and `src/index.js` appear |
| GO-E2E-027 | File Browser | Read generated source | Source contains `/health` and `/api/test` endpoints |
| GO-E2E-028 | File Browser | Read generated README | Real README content is displayed |
| GO-E2E-029 | Secrets | Sensitive values masked | API/UI return bullets and do not expose connection password |
| GO-E2E-030 | Secrets | Add secret | Secret persists and plaintext is not rendered |
| GO-E2E-031 | Secrets | Delete secret | Confirmation accepted and row disappears |
| GO-E2E-032 | Pipelines | Pipeline history display | Latest run and run history are visible |
| GO-E2E-033 | Pipelines | Required stages | Checkout, Install, Lint & Test, Build, Deploy, Smoke Test visible |
| GO-E2E-034 | Pipelines | Run control | Run Pipeline control and at least one run row visible |

Out of scope for this suite: starting the generated nested Docker sandbox, because that creates long-lived child containers and is materially slower/destructive. Generation, persisted metadata, file access, and the UI lifecycle controls are covered.
