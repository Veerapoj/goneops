# Phase 2 Project Generator Tasks

Date: 2026-05-25T00:42:07+07:00

## Project Generator

- [x] Create Project UI
- [x] Add stack selection
- [x] Add template selection
- [x] Add architecture presets
- [x] Generate project structure
- [x] Generate README file content
- [x] Generate Docker Compose file content
- [x] Generate architecture documentation content
- [x] Validate generated paths are relative and safe
- [x] Validate generated content avoids secret-like tokens

## Backend API

- [x] `GET /projects/options` returns allowlisted stacks, templates, and architecture presets
- [x] `POST /projects/generate` validates input and returns generated structure/files
- [x] Unsupported stack/template/preset values are rejected

## Frontend UI

- [x] Dashboard updated to Project Generator workflow
- [x] UI exposes project name, stack, template, and architecture preset inputs
- [x] UI exposes generated structure preview
- [x] Non-MVP navigation remains `Coming Soon`

## QA

- [x] `npm run qa:phase2` passed
- [x] Backend project generator tests passed
- [x] Frontend project generator UI tests passed
- [x] Backend runtime endpoint validation passed
- [x] Frontend runtime UI validation passed
- [x] Docker Compose config validation passed
- [x] PostgreSQL/Redis/RabbitMQ containers remained healthy
- [x] Tracked-file secret-like token scan passed
