import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("project generator UI exposes Phase 6 navigation and workflow", () => {
  for (const label of ["Dashboard", "Projects", "Project Generator", "Create Project UI", "Generate Project", "Phase 6"]) {
    assert.match(page, new RegExp(label));
  }
});

test("project generator UI exposes stack template and architecture selections", () => {
  for (const label of ["Stack selection", "Template selection", "Architecture preset", "next-nest", "internal-tool", "local-first"]) {
    assert.match(page, new RegExp(label));
  }
});

test("design generator UI exposes Mermaid and generated architecture documents", () => {
  for (const label of [
    "Design Generator Preview",
    "Mermaid generation",
    "Context diagram generation",
    "System diagram generation",
    "Deployment diagram generation",
    "API contract documentation"
  ]) {
    assert.match(page, new RegExp(label));
  }
});

test("git and CI preview exposes generated integration outputs", () => {
  for (const label of [
    "Git + CI/CD Preview",
    "Git initialization script",
    "Initial commit generation",
    "CI workflow template",
    ".github/workflows/ci.yml",
    "scripts/init-git.sh"
  ]) {
    assert.ok(page.includes(label));
  }
});

test("non-MVP navigation still uses Coming Soon placeholder text", () => {
  assert.match(page, /Coming Soon/);
});


test("observability preview exposes generated baseline outputs", () => {
  for (const label of [
    "Observability Baseline Preview",
    "Structured JSON logging",
    "OpenTelemetry baseline",
    "Health readiness liveness endpoints",
    "request_id",
    "trace_id",
    "apps/api/src/observability.ts",
    "apps/api/src/health.ts",
    "docs/observability.md"
  ]) {
    assert.ok(page.includes(label));
  }
});


test("phase 6 UI polish exposes responsive dark mode and navigation checks", () => {
  for (const label of [
    "Phase 6 — UI Polish",
    "UI Polish QA Checklist",
    "Responsive UI",
    "Dark mode ready",
    "Navigation works",
    "No broken pages",
    "aria-current",
    "Primary navigation",
    "lg:grid-cols-[272px_1fr]",
    "sm:grid-cols-2"
  ]) {
    assert.ok(page.includes(label));
  }
});
