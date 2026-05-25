import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("project generator UI exposes Phase 3 navigation and workflow", () => {
  for (const label of ["Dashboard", "Projects", "Project Generator", "Create Project UI", "Generate Project", "Phase 3"]) {
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

test("non-MVP navigation still uses Coming Soon placeholder text", () => {
  assert.match(page, /Coming Soon/);
});
