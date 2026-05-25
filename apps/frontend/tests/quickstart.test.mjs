import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const quickstart = readFileSync(new URL("../app/quickstart/page.tsx", import.meta.url), "utf8");
const advanced = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("quickstart edition is a separate one click project bootstrap UI", () => {
  for (const label of [
    "GoneOps QuickStart Edition",
    "One Click Project Bootstrap",
    "Select stack. Click generate. Run locally.",
    "Generate Real Runnable Project",
    "Advanced workspace"
  ]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart exposes supported MVP stack components", () => {
  for (const label of ["NextJS", "React", "Vue", "Static HTML", "Go Fiber", "NestJS", "ExpressJS", "FastAPI", "PostgreSQL", "MySQL", "MongoDB", "Redis", "RabbitMQ", "MinIO"]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart result panel shows real runnable project output fields", () => {
  for (const label of ["Project Name", "Stack Summary", "Generated Services", "Container Status", "Ports", "URLs", "Credentials", "Swagger URL", "API Examples", "Docker Commands"]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart realtime generation logs cover build and validation", () => {
  for (const label of ["[✓] Generate backend", "[✓] Generate Swagger", "[✓] Generate PostgreSQL config", "[✓] Generate Redis config", "[✓] Generate RabbitMQ workflow", "[✓] Generate Docker Compose", "[✓] Build containers", "[✓] Run health checks", "[✓] Validate API", "[✓] Validate Swagger"]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart includes generated files and env-driven commands", () => {
  for (const label of ["README.md", "docker-compose.yml", ".env.example", "Makefile", "openapi.yaml", "backend/Dockerfile", "frontend/Dockerfile", "database/seed.sql", "scripts/healthcheck.sh", "docker compose up --build", "${API_APP_PORT}"]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart UI excludes advanced workspace product concepts", () => {
  for (const forbidden of ["Memory state", "AI Agent Activity", "Workflow Progress", "Architecture Decisions", "Generation Timeline"]) {
    assert.ok(!quickstart.includes(forbidden));
  }
});

test("advanced workspace version remains present and separate", () => {
  assert.ok(advanced.includes("GoneOps Brain"));
  assert.ok(advanced.includes("Living AI engineering workspace"));
  assert.ok(!advanced.includes("GoneOps QuickStart Edition"));
});
