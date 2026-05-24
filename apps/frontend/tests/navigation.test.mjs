import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("dashboard shell exposes core Phase 1 navigation", () => {
  for (const label of ["Dashboard", "Projects", "Templates", "Observability", "Settings"]) {
    assert.match(page, new RegExp(label));
  }
});

test("non-MVP navigation uses Coming Soon placeholder text", () => {
  assert.match(page, /Coming Soon/);
});
