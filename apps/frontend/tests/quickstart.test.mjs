import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const quickstart = readFileSync(new URL("../app/quickstart/page.tsx", import.meta.url), "utf8");
const projectRoute = readFileSync(new URL("../app/quickstart/projects/[slug]/page.tsx", import.meta.url), "utf8");
const advanced = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const sandboxRoute = readFileSync(new URL("../app/quickstart/projects/[slug]/sandbox/page.tsx", import.meta.url), "utf8");

test("quickstart edition is a separate clickable create project flow", () => {
  for (const label of [
    "GoneOps QuickStart Edition",
    "Local-first Vercel for backend stacks",
    "Create Project",
    "Generate, push, build, and sandbox locally.",
    "Gitea source control",
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
    "Generate Woodpecker CI/CD",
    "Generate Hello World"
  ]) {
    assert.ok(quickstart.includes(label));
  }
});

test("quickstart result panel shows generated project link, logs, API target, and deletion controls", () => {
  for (const label of [
    "Local-first automation",
    "POST {apiBase}/quickstart/generate",
    "Project URL: /quickstart/projects/goneops-demo",
    "Sandbox URL: /quickstart/projects/goneops-demo/sandbox",
    "Gitea → Woodpecker CI → Docker Compose",
    "Open generated project:",
    "result.stackSummary",
    "result.generationLogs.map",
    "result.automation.logs.map",
    "Open sandbox URL:",
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
    "CI/CD logs",
    "Gitea repository:",
    "Woodpecker pipeline:",
    "Sandbox URL:",
    "Selected file",
    "setSelectedFilePath(file.path)",
    "selectedFile?.content",
  ]) {
    assert.ok(projectRoute.includes(label));
  }
});

test("quickstart sandbox route displays local-first build and startup validation", () => {
  for (const label of ["QuickStart Sandbox", "Local-first Vercel sandbox", "Source Control", "CI/CD", "Runtime", "Docker Compose sandbox", "Build and startup validation logs"]) {
    assert.ok(sandboxRoute.includes(label));
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
