import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const quickstart = readFileSync(new URL("../app/quickstart/page.tsx", import.meta.url), "utf8");
const projectRoute = readFileSync(new URL("../app/quickstart/projects/[slug]/page.tsx", import.meta.url), "utf8");
const advanced = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("quickstart edition is a separate clickable create project flow", () => {
  for (const label of [
    "GoneOps QuickStart Edition",
    "One Click Project Bootstrap",
    "Create Project",
    "Generate a runnable local project.",
    "This is now wired to the QuickStart backend API",
    "Generate Project",
    "Advanced workspace"
  ]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart create form posts selected options to backend generate API", () => {
  for (const snippet of [
    "fetch(`${apiBase}/quickstart/generate`",
    "method: \"POST\"",
    "name: projectName",
    "stack,",
    "database,",
    "cache,",
    "queue,",
    "includeReadme",
    "includeDockerCompose",
    "includeCi",
    "includeHelloWorld",
    "router.push(generated.project.url)"
  ]) {
    assert.ok(quickstart.includes(snippet));
  }
});

test("quickstart exposes selectable create project fields", () => {
  for (const label of [
    "Project Name:",
    "Stack:",
    "Database:",
    "Cache:",
    "Queue:",
    "NestJS",
    "NextJS",
    "Go Fiber",
    "FastAPI",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "RabbitMQ",
    "Generate README",
    "Generate Docker Compose",
    "Generate CI/CD",
    "Generate Hello World"
  ]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart result panel shows generated project link, logs, API target, and deletion controls", () => {
  for (const label of [
    "Manual Result",
    "POST {apiBase}/quickstart/generate",
    "Project URL: /quickstart/projects/goneops-demo",
    "README preview after generation",
    "Open generated project:",
    "result.stackSummary",
    "result.generationLogs.map",
    "Created Projects",
    "Delete project",
    "Confirm project name",
    "Delete selected project",
    "fetch(`${apiBase}/quickstart/projects`)",
    "method: \"DELETE\"",
    "localStorage.removeItem(`quickstart:${selectedProject.slug}`)"
  ]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart generated project route loads backend project URL and renders selectable file preview", () => {
  for (const label of [
    "GoneOps QuickStart Project",
    "fetch(`${apiBase}/quickstart/projects/${slug}`)",
    "Loaded from backend project URL",
    "Loaded from browser cache",
    "Project URL",
    "Generated files",
    "Create another project",
    "File Preview",
    "Selected file",
    "setSelectedFilePath(file.path)",
    "selectedFile?.content",
  ]) {
    assert.ok(projectRoute.includes(label));
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
