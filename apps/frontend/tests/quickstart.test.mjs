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
    "Generate QuickStart Project",
    "Advanced workspace"
  ]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart focuses only on stack selection and runnable local project outputs", () => {
  for (const label of [
    "Node HTTP API",
    "Node Service API",
    "Node Worker API",
    "README.md",
    "package.json",
    ".env.example",
    "src/server.js",
    "Dockerfile",
    "docker-compose.yml",
    "curl http://localhost:$PORT/hello"
  ]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart validation promises build run docker compose hello endpoint and env ports", () => {
  for (const label of ["Builds successfully", "Runs locally", "Docker Compose supported", "Hello World endpoint", "Ports from .env"]) {
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
