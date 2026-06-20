# GoneOps MVP End-to-End Test Cases

Execution target: Docker Compose full stack, Chromium through Playwright.

## Startup and platform

| ID | Test | Expected result |
|---|---|---|
| E2E-001 | Start with `docker compose up -d` | Frontend binds `:3000`, backend binds `:4000`, dependencies start, PostgreSQL is healthy |
| E2E-002 | Request `GET /api/health` | HTTP 200 with `status: ok` |
| E2E-003 | Load frontend root | HTTP 200 and React dashboard renders |

## Page and navigation coverage

| ID | Test | Expected result |
|---|---|---|
| E2E-010 | Load Overview | Overview heading and shell render without browser exceptions |
| E2E-011 | Load Environments | Environments heading and shell render |
| E2E-012 | Load Services | Services heading and shell render |
| E2E-013 | Load Databases | Databases heading and shell render |
| E2E-014 | Load Pipelines | Pipelines heading and shell render |
| E2E-015 | Load Deployments | Deployments heading and shell render |
| E2E-016 | Load Sandbox | Sandbox heading and lifecycle controls render |
| E2E-017 | Load File Browser | File Browser heading and file panes render |
| E2E-018 | Load Terminal | Terminal heading and terminal panel render |
| E2E-019 | Load Logs | Container Logs heading and log viewer render |
| E2E-020 | Load Secrets | Secrets heading and secret table/state render |
| E2E-021 | Load Settings | Settings heading and project controls render |
| E2E-022 | Navigate with every sidebar link | URL, page heading, and active-link state update for all 12 routes |

## Overview reference design

| ID | Test | Expected result |
|---|---|---|
| E2E-030 | Inspect sidebar dimensions and color | Width is 268px and background is `#071427` |
| E2E-031 | Inspect summary cards | Environment, Status, and Preview URL cards are visible |
| E2E-032 | Inspect service grid | Six service-type cards and runtime service section are visible |
| E2E-033 | Inspect CI/CD strip | Six required stages are visible |
| E2E-034 | Inspect Live App | Live App panel contains an iframe preview |
| E2E-035 | Inspect support panels | README, Project Info, and Quick Actions are visible |

## API and negative behavior

| ID | Test | Expected result |
|---|---|---|
| E2E-040 | List and retrieve projects | Created project appears and includes its environment |
| E2E-041 | Submit invalid project/environment requests | HTTP 400 validation errors |
| E2E-042 | Retrieve missing project | HTTP 404 |
| E2E-043 | Read file using path traversal | HTTP 403; host files are not exposed |
| E2E-044 | Read services/databases/secrets/logs | Live data returned; passwords and secret values remain masked |

## Sandbox and pipeline flows

| ID | Test | Expected result |
|---|---|---|
| E2E-050 | Generate sandbox from UI | Result is shown and all required files are created |
| E2E-051 | Browse README and `src/index.js` | Real generated file content is displayed |
| E2E-052 | Run sandbox | Environment reaches `running` |
| E2E-053 | Test generated API | PostgreSQL, Redis, and RabbitMQ all report `connected` |
| E2E-054 | Retrieve container logs | Web service startup log is returned |
| E2E-055 | Run pipeline | Persisted run succeeds with Checkout, Install, Lint & Test, Build, Deploy, Smoke Test |
| E2E-056 | Restart sandbox | Environment returns to `running` |
| E2E-057 | Stop sandbox | Environment reaches `stopped` |

## Loading and error states

| ID | Test | Expected result |
|---|---|---|
| E2E-060 | Delay project list API | Visible loading spinner appears, then Overview renders |
| E2E-061 | Return synthetic 503 for project detail | Human-readable error and Retry action render without a React exception |

## Artifacts

- Raw console log: `tests/e2e/results.log`
- Structured result: `tests/e2e/results.json`
- HTML report: `tests/e2e/playwright-report/index.html`
- Failure traces/screenshots/videos: `tests/e2e/test-results/`
