# Phase 1 Foundation Memory

Date: 2026-05-24

## Understanding

GoneOps is a local-first Internal Developer Platform inspired by Vercel, Railway, and Supabase. The MVP must focus on developer experience, standardized project creation, architecture consistency, and persistent engineering context.

## Architecture Decisions

- Use npm workspaces with `apps/frontend` and `apps/backend`.
- Use Next.js, TailwindCSS, and component-style primitives for the frontend shell.
- Use NestJS for the backend foundation.
- Use Docker Compose for local PostgreSQL, Redis, and RabbitMQ.
- Keep secrets out of version control with `.env` ignored and `.env.example` committed.

## Pending

- Project generator UI and backend generation workflow.
- Architecture preset selection.
- Generated documentation and Mermaid diagrams.
- Git automation and CI/CD templates.
- Full observability baseline.
- Docker Compose runtime validation in an environment with Docker installed.
- Monitor Next.js dependency updates for the moderate internal PostCSS advisory reported by npm audit.
