import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("homepage presents GoneOps as a living AI engineering workspace", () => {
  for (const label of [
    "GoneOps Brain",
    "Living AI engineering workspace",
    "Active project brain",
    "GoneOps is evolving the project continuously",
    "Not a static template generator",
    "active SDLC workspace",
    "AI is planning • validating • remembering"
  ]) {
    assert.ok(page.includes(label));
  }
});

test("workspace exposes project state phase task memory QA and git signals", () => {
  for (const label of [
    "Project state",
    "Current phase",
    "Current task",
    "Memory state",
    "QA state",
    "Git activity",
    "Post-MVP",
    "Living workspace UI",
    "Persistent",
    "Green",
    "origin/main at 55a307f"
  ]) {
    assert.ok(page.includes(label));
  }
});

test("workspace exposes AI agent activity and active SDLC loop", () => {
  for (const label of [
    "AI Agent Activity",
    "Planner Agent",
    "Generator Agent",
    "QA Agent",
    "Memory Agent",
    "planning",
    "generating",
    "validating",
    "remembering",
    "Live heartbeat"
  ]) {
    assert.ok(page.includes(label));
  }
});

test("workspace exposes architecture decisions workflow progress and timeline", () => {
  for (const label of [
    "Architecture Decisions",
    "Workflow Progress",
    "Generation Timeline",
    "Understand",
    "Plan",
    "Generate",
    "Validate",
    "Remember",
    "Commit",
    "Phase 1",
    "Phase 6",
    "E2E",
    "Now"
  ]) {
    assert.ok(page.includes(label));
  }
});

test("project generator output remains visible inside the active project brain", () => {
  for (const label of [
    "Project Generator Output",
    "README.md",
    "docker-compose.yml",
    ".woodpecker.yml",
    "scripts/init-git.sh",
    "apps/api/src/observability.ts",
    "docs/observability.md"
  ]) {
    assert.ok(page.includes(label));
  }
});

test("navigation keeps non-MVP placeholder boundaries explicit", () => {
  for (const label of ["Workspace", "Project Brain", "SDLC Flow", "Coming Soon", "aria-current", "Primary navigation"]) {
    assert.ok(page.includes(label));
  }
});

test("living workspace remains responsive and polished", () => {
  for (const label of ["lg:grid-cols-[288px_1fr]", "sm:grid-cols-2", "xl:grid-cols-3", "rounded-3xl", "shadow-sm"]) {
    assert.ok(page.includes(label));
  }
});
