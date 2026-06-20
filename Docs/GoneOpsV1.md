Build a working MVP web application based on the provided GoneOps dashboard HTML design.

Product name: GoneOps

Goal:
Create a web control dashboard for a DevOps DX platform that allows users to create a development environment, select runtime services, generate sandbox infrastructure, run CI/CD workflow, preview the running app, and test services from the UI.

Reference UI:
Use the provided HTML dashboard as the visual reference and convert it into a real working application.

Core concept:
GoneOps is similar to Vercel + Supabase + Railway for internal DevOps teams.

Scope for MVP:
Build the system as a local-first working demo.

Required tech stack:

* Frontend: React + Vite + TailwindCSS
* Backend: Node.js + Express
* Database: PostgreSQL
* Cache: Redis
* Message Queue: RabbitMQ
* Container: Docker Compose

Main pages:

1. Overview
2. Environments
3. Services
4. Databases
5. Pipelines
6. Deployments
7. Sandbox
8. File Browser
9. Terminal
10. Logs
11. Secrets
12. Settings

MVP behavior:

1. Project Overview

* Show project name
* Show selected environment, default is Dev
* Show environment status
* Show generated preview URL
* Show runtime services
* Show latest deployment
* Show README panel
* Show quick actions

2. Create Environment

* User can create a Dev environment
* Environment naming must follow project name
* Example:

  * project: goneops-demo
  * env: dev
  * database: goneops_demo_dev_db
  * redis: goneops_demo_dev_redis
  * mq: goneops_demo_dev_mq

3. Service Selection
   User can select:

* Language: Node.js, Go, Python
* Database: PostgreSQL, MySQL
* Cache: Redis
* MQ: RabbitMQ
* Storage: MinIO

For MVP, implement:

* Node.js
* PostgreSQL
* Redis
* RabbitMQ

4. Sandbox Runtime
   When the user clicks “Generate Sandbox”, the system should generate:

* project folder
* source code
* Dockerfile
* docker-compose.yml
* .env
* README.md

Generated app must include:

* Express API
* /health endpoint
* /api/test endpoint
* PostgreSQL connection test
* Redis connection test
* RabbitMQ connection test

5. Run Sandbox
   User can click:

* Run
* Stop
* Restart
* Test API

The backend should execute Docker Compose commands locally.

For MVP, use child_process safely with project-specific working directory.

6. Live App Preview

* Show preview URL
* Open running sandbox app in iframe or new tab
* Test API button should call /api/test from generated sandbox app
* Show response JSON in the UI

7. CI/CD Pipeline
   Create a simulated but functional pipeline:

* Checkout
* Install
* Lint & Test
* Build
* Deploy
* Smoke Test

Each step should show:

* status: pending, running, success, failed
* duration
* logs

For MVP:

* Pipeline can run local scripts
* Store pipeline runs in PostgreSQL

8. File Browser

* Show generated project files
* User can click file and view content
* Required visible files:

  * README.md
  * package.json
  * Dockerfile
  * docker-compose.yml
  * .env.example
  * src/index.js

9. Logs

* Show live logs from Docker containers
* Support refresh button
* For MVP, polling is acceptable

10. README
    Auto-generate README with:

* Project name
* Environment
* Stack
* URLs
* Ports
* DB name
* DB username
* Redis name
* RabbitMQ username
* Run command
* Test command
* API endpoints

11. Secrets

* Show environment variables
* Mask sensitive values
* Allow copy connection string

12. Database page
    Show:

* DB host
* DB port
* DB name
* DB username
* masked password
* connection string
* button: Test DB Connection

13. API requirements
    Create backend APIs:

* GET /api/projects
* POST /api/projects
* GET /api/projects/:id
* POST /api/projects/:id/environments
* POST /api/projects/:id/generate-sandbox
* POST /api/projects/:id/run
* POST /api/projects/:id/stop
* POST /api/projects/:id/restart
* POST /api/projects/:id/test-api
* GET /api/projects/:id/files
* GET /api/projects/:id/files/content
* GET /api/projects/:id/logs
* GET /api/projects/:id/pipelines
* POST /api/projects/:id/pipelines/run

14. Data model
    Use PostgreSQL tables:

* projects
* environments
* services
* deployments
* pipeline_runs
* pipeline_steps
* secrets

15. UX requirements

* Keep UI close to the provided HTML
* Dark blue sidebar
* White dashboard area
* Rounded cards
* Service cards
* Runtime service table
* CI/CD pipeline visual
* Right-side Live App preview
* README panel
* Quick actions panel

16. Local development requirements
    The final project must include:

* README.md
* docker-compose.yml
* .env.example
* frontend package.json
* backend package.json
* database migration or init.sql
* seed demo data
* clear startup command

Expected startup:
docker compose up -d

Then open:
http://localhost:3000

Quality rules:

* Do not create mock-only UI
* Buttons must call real backend APIs
* Generate Sandbox must create real files
* Run must start real Docker containers
* Test API must return real response from sandbox app
* File Browser must read real generated files
* Logs must read real container logs
* README must be generated from project config
* Keep code clean and modular

Deliverables:

* Complete source code
* Folder structure
* Docker Compose
* Backend API
* Frontend UI
* Generated sandbox template
* README with setup instructions

Implementation order:

1. Create project structure
2. Build backend API
3. Build database schema
4. Build sandbox generator
5. Build Docker Compose runner
6. Build frontend UI from provided HTML
7. Wire UI buttons to backend APIs
8. Add file browser
9. Add logs viewer
10. Add pipeline runner
11. Add README generator
12. Test full flow end-to-end

Do not skip functionality.
Do not only create static screens.
Build a working MVP.

