# GoneOps MVP — Architecture Decision Record

Stage: `architecture` · Target: local-first DevOps DX dashboard.
Decision revision: 2026-06-21.1 (adds the remaining MVP networking, selection-repair, and
environment-scoped pipeline-read decisions).
Decision status: accepted target architecture; current implementation is non-conformant until all
verification gates in section 13 pass.
Machine-readable decision: [`architecture-decision.json`](./architecture-decision.json).

This document is authoritative for implementation. It freezes component boundaries, contracts,
state transitions, and trust boundaries. Where planning notes, existing code, and this ADR
disagree, this ADR wins. Existing code is an implementation input, not an architectural contract.

## 1. Topology

GoneOps uses two Docker Compose planes:

1. The control plane is the root Compose project: nginx-served React SPA, Express API,
   PostgreSQL, Redis, and RabbitMQ.
2. The sandbox plane is one generated Compose project per environment: Express app, PostgreSQL,
   Redis, and RabbitMQ, launched by the control-plane backend through the mounted Docker socket.

```text
Browser :3000
    |
    v
nginx / React SPA -- /api --> Express :4000
                                  |-- PostgreSQL metadata
                                  |-- Redis / RabbitMQ clients
                                  |-- sandbox volume
                                  `-- Docker socket --> generated sandbox stacks
```

The browser uses one origin, `http://localhost:3000`; nginx proxies `/api` to the backend. The
backend enables CORS only for direct local tooling. Control-plane ports are fixed at 3000, 4000,
5432, 6379, 5672, and 15672. Sandbox host ports are allocated from 20000 upward.

The root Compose project creates the named bridge network `goneops_net`. Generated sandbox
projects declare `goneops_net` as external and join it. Because every sandbox shares this network,
plain Compose service names such as `db`, `redis`, and `mq` are not stable identities: Docker DNS
may resolve a container from another sandbox. Every generated service therefore publishes the
resource-prefix aliases `<prefix>_web`, `<prefix>_db`, `<prefix>_redis`, and `<prefix>_mq`.
Generated web configuration addresses dependencies through those aliases. The backend reaches
sandbox HTTP by `<prefix>_web` and uses the allocated published port only for browser-facing URLs.
Compose service names remain valid for same-project declarations such as `depends_on`, but they are
not used as runtime connection endpoints on the shared network.

The checked-in `sandbox-template/docker-compose.yml` is the normal generation source. The inline
fallback in `backend/src/sandbox/generator.js` must remain behaviorally equivalent for aliases and
dependency host values until that fallback is removed.

### 1.1 Docker client/daemon filesystem contract

The Docker CLI runs inside the backend container while the mounted socket controls the host
daemon. This split is an explicit trust and portability boundary:

- generated Compose files and build contexts must be readable by the backend-side Docker CLI;
- generated Compose files must not contain backend-container-local bind-mount source paths,
  because the host daemon resolves bind sources in the daemon's filesystem namespace;
- the MVP generated stack therefore uses image build contexts sent by the CLI, named volumes,
  and the external `goneops_net`, not host-path bind mounts;
- `working_dir` is a control-plane path used by the backend CLI and file browser, not a path that
  sandbox containers may assume exists;
- a future design that adds generated source bind mounts must replace the named sandbox volume
  with a host bind mounted at the identical absolute path in the backend container and document
  that host path as configuration.

Mounting `/var/run/docker.sock` grants the backend effective host-level Docker control. The
system is therefore single-user, localhost-only, and outside the security model for hostile
multi-tenancy.

## 2. Components

| ID | Component | Path | Responsibility |
|---|---|---|---|
| C1 | Root orchestration | `/docker-compose.yml`, `/.env.example`, `/README.md` | One-command startup, health checks, volumes, network, and operator instructions. |
| C2 | Schema | `/database/init.sql` | Tables, constraints, indexes, and idempotent demo seed. |
| C3 | Backend core | `/backend/src/app.js`, `/backend/src/server.js` | Express lifecycle, middleware, health endpoint, and error envelope. |
| C4 | Infrastructure clients | `/backend/src/lib/*` | PostgreSQL pool plus Redis and RabbitMQ startup retry. |
| C5 | HTTP controllers | `/backend/src/routes/*` | Request validation and HTTP translation only. |
| C6 | Application services | `/backend/src/services/*` | Project, environment, service-selection, database, deployment, secret, file, log, terminal, and pipeline use cases. |
| C7 | Sandbox generator | `/backend/src/sandbox/generator.js` | Renders a complete project from versioned templates. |
| C8 | Container runner | `/backend/src/sandbox/runner.js` | Allowlisted Compose lifecycle, logs, Docker preflight, and sandbox HTTP proxy. |
| C9 | Port allocator | `/backend/src/sandbox/ports.js` | Transactional four-port reservation per environment. |
| C10 | README generator | `/backend/src/sandbox/readme.js` | Documents generated stack, identifiers, ports, commands, and endpoints. |
| C11 | Sandbox templates | `/backend/templates/sandbox/*` | Express source, package manifest, Dockerfile, Compose, and environment template. |
| C12 | Frontend shell | `/frontend/src/App.jsx`, `/frontend/src/layout/*`, `/frontend/src/context/*` | Router, 268px sidebar, topbar, and selected project/environment state. |
| C13 | Frontend pages | `/frontend/src/pages/*` | Twelve required pages, all backed by API data. |
| C14 | API client | `/frontend/src/api/client.js` | Typed request functions and consistent client-side error handling. |
| C15 | Frontend container | `/frontend/Dockerfile`, `/frontend/nginx.conf` | Vite production build, SPA fallback, and `/api` reverse proxy. |
| C16 | Operation reconciliation | `/backend/src/operations/*` | Resumes or resolves persisted lifecycle and pipeline operations after process restart. |

Routes must not access SQL, the filesystem, Docker, shell commands, or sandbox HTTP directly.
They call C6 services, which coordinate repositories and C7–C11. This boundary is required even
if the current code combines those concerns.

The paths in this table are target ownership boundaries. Components that do not yet exist as
separate modules must be introduced during implementation rather than weakening the boundary.

### 2.1 Required backend module map

The implementation stage must converge on this dependency direction:

```text
routes -> services -> repositories/adapters -> PostgreSQL | filesystem | Docker | HTTP
```

The minimum target modules are:

| Layer | Target modules | Allowed dependencies |
|---|---|---|
| HTTP | `routes/projects.js`, `routes/environments.js`, `routes/sandboxes.js`, `routes/pipelines.js`, `routes/resources.js`, `routes/terminal.js` | validation schemas, application services, error types |
| Application | `services/projectService.js`, `environmentService.js`, `sandboxService.js`, `pipelineService.js`, `resourceService.js`, `terminalService.js` | repositories and infrastructure adapters |
| Persistence | `repositories/projectRepository.js`, `environmentRepository.js`, `pipelineRepository.js`, `resourceRepository.js`, `portRepository.js` | PostgreSQL client only |
| Infrastructure | `infrastructure/dockerAdapter.js`, `fileAdapter.js`, `sandboxHttpAdapter.js`, `terminalAdapter.js` | Docker CLI, async filesystem APIs, bounded HTTP, WebSocket process transport |
| Generation | `sandbox/generator.js`, `sandbox/templates/*`, `sandbox/readme.js` | file adapter, port repository, environment repository |
| Operations | `operations/reconciler.js`, `operations/lifecycleExecutor.js`, `operations/pipelineExecutor.js` | application services, repositories, infrastructure adapters |

Routes own HTTP status codes and DTO translation. Services own use-case transactions and state
transitions. Repositories own parameterized SQL. Adapters own side effects and expose injectable
interfaces so failure and concurrency behavior can be tested without a live Docker daemon.
Operation reconciliation may call application services and adapters but cannot bypass repository
ownership checks or invent state outside PostgreSQL. Circular imports between these layers are
prohibited.

## 3. Persistence Model

PostgreSQL is the source of truth for metadata:

- `projects`
- `environments`, including `working_dir` and `preview_url`
- `services`
- `deployments`
- `pipeline_runs`
- `pipeline_steps`
- `secrets`
- `sandbox_ports`

Required constraints include:

- unique project name;
- unique `(project_id, environment name)`;
- unique `(environment_id, secret key)`;
- unique `(pipeline_run_id, step_order)`;
- unique sandbox `host_port`;
- unique `(environment_id, role)`, where role is `web`, `db`, `redis`, or `mq`;
- foreign-key indexes for every environment, project, pipeline-run, and deployment lookup.

`environments` also stores the selected MVP stack as a constrained JSON document or equivalent
normalized rows. Its accepted values are `nodejs`, `postgresql`, `redis`, and `rabbitmq`; all four
are enabled by default. Unsupported catalog choices shown by the visual reference (Go, Python,
MySQL, MinIO, Kafka, and generic “Other”) are visibly disabled and must not be persisted as if
they were operational.

`pipeline_runs` is associated with the selected environment. A migration may add
`environment_id` to the table. This is mandatory for the next implementation pass; the temporary
project-only model is rejected because it cannot enforce ownership or concurrent-run rules.

The schema also requires:

- a check constraint for valid environment statuses;
- a check constraint for pipeline run and step statuses;
- `pipeline_runs.environment_id NOT NULL REFERENCES environments(id)`;
- a partial unique index allowing at most one `pending` or `running` pipeline per environment;
- an index on `(environment_id, created_at DESC)` for pipeline polling;
- an environment `resource_prefix` column unique across all environments, so normalized Docker
  names cannot collide even when display names differ.

Generated source remains on the sandbox volume. PostgreSQL stores only its absolute working
directory and related metadata. File contents are never mocked or stored in the database.

The demo seed must be idempotent. Re-running initialization logic cannot duplicate pipeline runs,
steps, deployments, services, secrets, or port mappings.

## 4. HTTP Contract

Base path is `/api`; request and response bodies are JSON.

### Required 14 endpoints

| Method | Path | Contract |
|---|---|---|
| GET | `/projects` | Projects with environments and current status. |
| POST | `/projects` | Create a uniquely named project. |
| GET | `/projects/:id` | Overview aggregate: environments, services, latest deployment, and pipeline. |
| POST | `/projects/:id/environments` | Create an environment and derive normalized resource identifiers. |
| POST | `/projects/:id/generate-sandbox` | Allocate ports and write real generated files; return manifest. |
| POST | `/projects/:id/run` | Persist `starting`, return 202, then start Compose asynchronously. |
| POST | `/projects/:id/stop` | Persist `stopping`, return 202, then stop Compose asynchronously. |
| POST | `/projects/:id/restart` | Persist `restarting`, return 202, then restart asynchronously. |
| POST | `/projects/:id/test-api` | Server-side proxy to the sandbox `/api/test`. |
| GET | `/projects/:id/files` | Allowlisted real file tree for the selected environment. |
| GET | `/projects/:id/files/content` | Bounded text-file content after traversal checks. |
| GET | `/projects/:id/logs` | Tail of real Compose logs for polling. |
| GET | `/projects/:id/pipelines` | Pipeline runs with ordered steps. |
| POST | `/projects/:id/pipelines/run` | Create a run, return 202, and execute six persisted steps. |

Environment-scoped requests accept `environment_id` in the documented query or body location.
Every endpoint verifies that the environment belongs to `:id`.

### Supporting dashboard endpoints

The twelve pages require additive endpoints for services, databases, deployments, and secret
list/upsert/delete operations. These do not replace or alter the required 14 endpoints. The
minimum supporting contract is:

| Method | Path | Contract |
|---|---|---|
| GET | `/projects/:id/services` | Selected catalog and runtime service state for one owned environment. |
| PUT | `/projects/:id/services` | Validate and persist the four-service MVP selection before generation. |
| GET | `/projects/:id/databases` | Host-facing database metadata with password masked. |
| POST | `/projects/:id/databases/test` | Execute a real bounded database connection test. |
| GET | `/projects/:id/deployments` | Deployment history for an owned environment. |
| GET/POST/DELETE | `/projects/:id/secrets...` | Masked list and explicit secret mutations. |
| WS | `/projects/:id/terminal` | Localhost-only terminal session attached to the generated web container. |

The services mutation accepts only the supported MVP set. Generation reads the persisted
selection; it does not silently overwrite a user choice with a hard-coded catalog.

Lifecycle operations return `environment_id`, the transitional status, and a stable project
status URL. Pipeline execution returns its persisted `pipeline_run_id` and status URL. A
compare-and-set transition rejects a second lifecycle operation while the environment is already
`generating`, `starting`, `stopping`, or `restarting`. The frontend polls the project or pipeline
resource and cancels polling when the page unmounts or selection changes.

Errors use one envelope:

```json
{"error":{"code":"docker_unavailable","message":"Docker daemon is unavailable","details":{}}}
```

Expected codes are `validation_error`, `not_found`, `conflict`, `path_forbidden`,
`docker_unavailable`, `operation_failed`, and `upstream_unavailable`.

The canonical error type carries `status`, `code`, `message`, and optional safe `details`.
Infrastructure stderr, stack traces, filesystem roots, and secret values are never copied into a
production response. Validation is performed before service invocation; database uniqueness and
conditional-update failures are translated to `conflict`.

## 5. Sandbox Generation

Generation writes:

- `package.json`
- `src/index.js`
- `Dockerfile`
- `docker-compose.yml`
- `.env`
- `.env.example`
- `README.md`

The app exposes `/health` and `/api/test`. `/api/test` performs real PostgreSQL, Redis, and
RabbitMQ connection checks. Internal connection strings use Compose service names; host-facing
connection strings use allocated ports.

Generation is synchronous for the MVP because writes are bounded, but it is transactional at the
application level: validate ownership, persist `generating`, reserve ports, render into a sibling
temporary directory, atomically replace the target directory, then persist metadata and return to
`stopped`. Failure marks the environment `failed` and must not leave a partially advertised
sandbox. Regeneration reuses the environment's assigned ports and rotates generated credentials
as one coordinated update.

Port allocation takes a PostgreSQL transaction-scoped advisory lock before reading the current
maximum and inserting all four rows. Database unique constraints are the final collision guard.
A complete existing assignment is reused; a partial assignment is repaired transactionally.

The filesystem cannot participate in the PostgreSQL transaction, so generation uses an explicit
saga:

1. conditionally claim `stopped|failed -> generating`;
2. reserve or reuse the four ports in PostgreSQL;
3. render all files into `<working_dir>.tmp-<operation-id>`;
4. validate the rendered manifest and Compose configuration;
5. rename the prior final directory to a backup, then atomically rename the temporary directory;
6. transactionally replace services and secrets and persist `working_dir`, `preview_url`, and
   `status = stopped`;
7. remove the backup only after metadata commit.

On failure, the temporary directory is removed, the backup is restored when present, newly
created port rows are released only when no previous assignment existed, and the environment is
marked `failed` with a non-secret diagnostic. A process crash may leave temporary or backup
directories; startup reconciliation removes stale temporary directories and restores the newest
valid backup if metadata points at a missing final directory.

## 6. Runtime and State Model

Environment status transitions are persisted:

```text
stopped -> generating -> stopped
stopped|failed -> starting -> running|failed
running|failed -> restarting -> running|failed
running|failed -> stopping -> stopped|failed
```

Run, stop, restart, and pipeline execution return 202 after the transitional status is visible.
The response includes the owned `environment_id`, current status, and stable polling URL. The
background executor is allowed to be in-process for this single-instance MVP, but PostgreSQL
remains authoritative: no operation may depend on an in-memory queue or mutex for correctness.
On backend startup, stale transitional states are reconciled with Docker state or marked failed.
Lifecycle transitions use a conditional database update so two API requests cannot both start
work from the same prior state.

The conditional update is the lock:

```sql
UPDATE environments
SET status = $next, updated_at = NOW()
WHERE id = $id AND project_id = $project_id AND status = ANY($allowed_previous)
RETURNING *;
```

Zero returned rows means either ownership failure or state conflict; a follow-up owned lookup
distinguishes `not_found` from HTTP 409 `conflict`. No in-memory mutex is authoritative because
multiple backend processes may exist.

Pipeline runs transition `pending -> running -> success|failed`. Steps transition
`pending -> running -> success|failed`; later steps become `skipped` after failure. Terminal runs
store duration and logs. The MVP pipeline is explicitly labeled simulated: timers and generated
logs must not claim real checkout, test, image-build, or deployment execution.

Pipeline and lifecycle executors must be idempotent at state boundaries. A restarted process may
observe a persisted transitional state and safely reconcile it, but it must not create duplicate
pipeline steps, deployments, service records, credentials, or port reservations. This is the
MVP recovery model; introducing RabbitMQ-backed workers is an additive evolution and does not
change PostgreSQL's authority.

Docker commands use `spawn` or `execFile` with fixed argument arrays. Request data is never
interpolated into a shell command. Commands have bounded timeouts and output limits. Docker
preflight failure returns HTTP 503 without affecting `/api/health`.

The Terminal page is an explicit exception to command allowlisting because its purpose is an
interactive shell. It is localhost-only and attaches to the generated `web` container, never to
the backend container or host shell. The server derives the Compose project and service from the
owned environment record, starts `docker compose exec -T web sh` with fixed arguments, pipes only
session bytes to stdin/stdout, applies idle and maximum-session timeouts, caps buffered output,
terminates the child on WebSocket close, and redacts known secret values from server-side logs.
nginx must pass WebSocket upgrade headers for this route. No terminal command content is written
to application logs or PostgreSQL.

Terminal transport is required for MVP conformance because Terminal is one of the twelve required
pages. An unavailable-state page is acceptable only when Docker is unavailable or no running
sandbox exists; omitting the WebSocket route is not conformant.

## 7. Filesystem and Security Boundaries

The browser is untrusted. IDs, paths, secret keys, and log-tail values are validated server-side.

File browsing resolves both the sandbox root and requested target with `realpath`, rejects
escaping symlinks, rejects directories on the content endpoint, caps readable size, and exposes
only generated allowlisted files. Prefix-only `path.resolve` checks are insufficient. Request
handlers use asynchronous filesystem APIs.

The backend alone can access PostgreSQL credentials, the sandbox volume, and Docker socket.
Docker-socket access is equivalent to host control, so this MVP is single-user and localhost-only
and must not be exposed to an untrusted network.

Container names, Compose project names, network aliases, database identifiers, and working
directories are derived only from the persisted normalized `resource_prefix`; request-provided
names are never passed directly to Docker. Environment ownership is checked before this prefix
or a working directory is returned to an adapter.

Generated names have two representations: a display name and a normalized resource prefix.
Normalization is deterministic, lowercase, replaces non-alphanumeric runs with `_`, trims edge
separators, and rejects an empty result. Database identifiers use
`<project>_<environment>_db`; Redis and RabbitMQ resource names use the corresponding `_redis`
and `_mq` suffixes. The backend checks normalized-name collisions, not only display-name
uniqueness.

Secrets are plaintext for the MVP, masked in UI, and excluded from request, application,
pipeline, and normal list logs. The generated README states that this is not production-safe.

The iframe preview is best-effort. Test API remains server-side and is the reliable integration
path when browser framing or mixed-content rules block preview.

## 8. Frontend Architecture

React Router exposes Overview, Environments, Services, Databases, Pipelines, Deployments,
Sandbox, File Browser, Terminal, Logs, Secrets, and Settings.

The shell follows the preview: `#071427` sidebar, white workspace, rounded soft-shadow cards,
service selection cards, runtime service table, six-step pipeline, live preview, README, project
info, and quick actions. `lucide-react` supplies icons.

Project and environment selection are shared state persisted to local storage. Server data is
authoritative and refreshed after mutations. Once the selected project's environments are known,
`ProjectContext` validates the persisted `selectedEnvironmentId` against that exact project. A
missing or foreign environment ID is repaired to the project's first environment, or cleared when
the project has none, with React state and local storage updated together. Repair is deferred while
the project payload is unavailable so initial loading does not erase a potentially valid choice.
Every page includes loading, empty, error, and Docker-unavailable states. Mutation controls prevent
duplicate submission.

Pipeline history is an environment-scoped view. `fetchPipelines(projectId, environmentId)` sends
`environment_id` as a query parameter, and the Pipelines page neither loads nor polls until both
selection IDs exist. Selection changes replace the displayed history with data for the new
environment; project-wide fallback behavior remains a backend compatibility detail, not a frontend
default.

No runtime service, deployment, pipeline, file, log, secret, or preview data may come from static
frontend mocks.

The preview HTML includes Storage and Jobs navigation entries, but they are outside the twelve-page
MVP. They may be omitted or rendered disabled; they must not route to mock pages. Terminal is a
real container session as specified above. Settings is limited to real project creation/selection
and documented local configuration; unsupported controls are disabled rather than simulated.

## 9. Requirement Traceability

| Product capability | Owning components | Persisted or external state | Verification |
|---|---|---|---|
| Project and environment management | C5, C6, C14, C13 | `projects`, `environments` | Create, reload, and select an environment without static client data. |
| Service selection | C5, C6, C13, C14 | `services` or constrained environment stack selection | Supported choices round-trip; unsupported preview choices remain disabled. |
| Sandbox generation | C6–C11 | sandbox volume, `working_dir`, `sandbox_ports`, `secrets` | Required seven files exist and contain derived names and allocated ports. |
| Sandbox lifecycle | C6, C8 | Docker daemon, environment status | 202 response precedes completion; polling reaches a terminal state. |
| API and database tests | C6, C8, generated app | running sandbox services | Results come from real bounded network/database operations. |
| File browser and logs | C6, C8, C13 | generated files and Compose logs | Displayed content changes when underlying real state changes. |
| Pipeline | C6, C13 | `pipeline_runs`, `pipeline_steps`, `deployments` | Six ordered steps persist status, duration, and logs. |
| Secrets | C6, C13 | `secrets`, generated `.env` | Lists are masked; explicit copy/reveal does not write values to logs. |
| Live preview | C13, C15 | allocated sandbox web port | Iframe is best-effort; server-side Test API remains functional. |
| One-command startup | C1, C2, C3, C15 | Docker Compose resources | Empty-volume `docker compose up -d` serves the SPA and API. |

## 10. Deployment Contract

`docker compose up -d` from the repository root starts the full control plane. The app is
available at `http://localhost:3000`, and nginx proxies API traffic to the backend.

The backend image includes a Docker CLI and Compose plugin compatible with the mounted host
daemon. The sandbox named volume survives backend container replacement. PostgreSQL uses a
separate persistent volume and initializes from `database/init.sql`.

`.env.example` documents all variables. `README.md` documents setup, the Docker-socket security
implication, plaintext-secret limitation, and the end-to-end flow:
project -> environment -> generate -> run -> test -> logs -> pipeline -> files.

## 11. Implementation Reconciliation Baseline

The repository inspected on 2026-06-20 is a partial implementation of this architecture. The next
implementation pass must close these concrete gaps before the architecture can be considered
conformant:

1. Split the monolithic project router so controllers no longer execute SQL or synchronous
   filesystem operations directly.
2. Introduce versioned sandbox templates and atomic temporary-directory generation; the current
   generator emits source inline into the final directory.
3. Add compare-and-set lifecycle transitions and startup reconciliation for stale transitional
   states.
4. Standardize the structured error envelope and ensure Docker, upstream, validation, conflict,
   and path failures map to stable codes.
5. Add persisted service-selection mutation and a real database-test endpoint; current dashboard
   reads are insufficient for the product behavior.
6. Scope pipeline runs to environments and label generated pipeline logs as simulated; logs must
   not claim that Docker builds or deploys actually occurred.
7. Replace secret list responses with masked DTOs. Plaintext may only be returned by an explicit,
   narrowly scoped reveal/copy action.
8. Implement the container-only Terminal transport. The page may show an honest unavailable
   state only when its owned environment is not running or Docker is unavailable; a missing
   server route or client-side command simulator is not acceptable.
9. Add nginx WebSocket upgrade handling for Terminal.
10. Add automated tests for ownership, path traversal and symlink escape, concurrent port
    allocation, lifecycle conflicts, masked secrets, and Docker-unavailable behavior.
11. Add an explicit startup reconciler for transitional lifecycle and pipeline states; current
    detached `setImmediate` work is lost if the backend process exits.
12. Ensure generated Compose never embeds backend-local bind paths, and copy versioned sandbox
    templates into the backend image instead of relying on an inline fallback.

These are implementation obligations, not optional future enhancements.

## 12. Implementation Slices and Ordering

The next implementation stage must proceed in dependency order:

1. Schema migration: environment resource prefix, pipeline environment ownership, status checks,
   and active-pipeline uniqueness.
2. Shared error types, request validation, repositories, and ownership helpers.
3. Split route handlers from resource, file, secret, database, and deployment services.
4. Introduce injectable async file, Docker, sandbox HTTP, and terminal adapters.
5. Implement compare-and-set lifecycle transitions and startup reconciliation.
6. Replace inline generation with versioned templates and the generation saga.
7. Add service-selection mutation and direct database connection test.
8. Scope pipeline reads/runs to the selected environment and reject concurrent active runs.
9. Implement terminal WebSocket transport and nginx upgrade forwarding.
10. Implement startup operation reconciliation and idempotent executor boundaries.
11. Add automated architecture, unit, integration, concurrency, and security tests before
    end-to-end Docker validation.

Each slice must preserve the stable required 14-endpoint contract. Supporting endpoints are
additive. Frontend changes follow backend contract completion rather than embedding temporary
client-only behavior.

## 13. Implementation Verification Gates

Implementation is complete only when:

1. Controllers contain no direct SQL, filesystem, shell, or sandbox HTTP access.
2. Schema initialization from an empty volume succeeds and seed data is idempotent.
3. Concurrent environment generation cannot allocate overlapping ports.
4. Traversal tests cover `..`, absolute paths, sibling-prefix paths, and escaping symlinks.
5. Docker-unavailable behavior returns the structured 503 envelope.
6. Backend tests/syntax checks, frontend production build, and `docker compose config` pass.
7. With Docker available, the documented end-to-end flow uses real files, containers, logs,
   service checks, and persisted pipeline state.
8. Service selection round-trips through PostgreSQL and unsupported catalog options cannot be
   submitted.
9. Terminal WebSocket ownership, nginx upgrade, process cleanup, timeout, and container-only
   execution tests pass.
10. Concurrent lifecycle requests produce one accepted transition and one conflict response.
11. A static architecture test fails if route modules import the database client, Node
    filesystem modules, child-process modules, Docker adapters, or raw HTTP clients.
12. Pipeline ownership tests prove a project cannot read or start a run for another project's
    environment, and a second active run receives HTTP 409.
13. Generation failure-injection tests prove that existing valid files, service metadata,
    secrets, and port assignments remain coherent after failures before render, before rename,
    and before metadata commit.
14. Restart tests prove persisted `starting`, `stopping`, `restarting`, and active pipeline states
    are reconciled without duplicate side effects.
15. Generated Compose validation proves no backend-container-local path is emitted as a host bind
    source.
16. Generated Compose validation covers both the checked-in template and inline fallback and proves
    that web, db, redis, and mq expose unique resource-prefix aliases and web uses the unique
    dependency aliases.
17. Frontend tests prove a stale persisted environment from another project repairs after project
    load/refresh, while a project with no environments clears the selection without an initial-load
    race.
18. Pipeline UI tests prove initial loads, refreshes, post-run reloads, and polling all include the
    selected `environment_id`; the frontend production build and all seven Playwright E2E specs
    pass.

## 14. Decision Outcome

The architecture stage is accepted with the following non-negotiable outcome:

- GoneOps is a local-first, single-user control plane that manages isolated generated sandbox
  stacks through Docker Compose.
- PostgreSQL is authoritative for ownership, lifecycle state, pipeline state, secrets metadata,
  and port reservations; generated files and container state remain external resources.
- HTTP controllers are transport adapters only. Application services coordinate repositories and
  infrastructure adapters, and all cross-resource mutations use explicit state transitions or
  rollback procedures.
- The required 14 REST endpoints remain stable. Supporting dashboard and Terminal contracts are
  additive and environment-scoped.
- Real files, Docker operations, logs, service checks, and persisted pipeline records are required;
  unavailable dependencies must produce explicit failure states rather than mock success.

The compact artifact consumed by the workflow orchestrator is maintained in
`architecture-decision.json`. This ADR remains the detailed source for implementation boundaries,
state machines, security controls, traceability, and verification gates.
