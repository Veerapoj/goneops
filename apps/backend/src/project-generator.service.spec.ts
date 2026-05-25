import * as assert from "node:assert/strict";
import { test } from "node:test";
import { ProjectGeneratorService } from "./project-generator.service";

const service = new ProjectGeneratorService();

test("project generator creates a valid project structure", () => {
  const output = service.generate({
    name: "Customer Portal",
    stack: "next-nest",
    template: "saas-dashboard",
    architecturePreset: "local-first"
  });

  assert.equal(output.project.slug, "customer-portal");
  assert.equal(output.validation.valid, true);
  assert.ok(output.structure.includes("customer-portal/README.md"));
  assert.ok(output.structure.includes("customer-portal/docs/context-diagram.md"));
  assert.ok(output.structure.includes("customer-portal/docs/system-diagram.md"));
  assert.ok(output.structure.includes("customer-portal/docs/deployment-diagram.md"));
  assert.ok(output.structure.includes("customer-portal/docs/api-contract.md"));
  assert.ok(output.structure.includes("customer-portal/.github/workflows/ci.yml"));
  assert.ok(output.structure.includes("customer-portal/scripts/init-git.sh"));
  assert.ok(output.files.some((file) => file.path === "customer-portal/docker-compose.yml"));
});

test("project generator rejects unsupported options", () => {
  assert.throws(
    () =>
      service.generate({
        name: "Bad Project",
        stack: "rails" as never,
        template: "internal-tool",
        architecturePreset: "local-first"
      }),
    /Unsupported stack/
  );
});

test("generated files avoid secret-looking tokens", () => {
  const output = service.generate({ name: "Safe App" });
  for (const file of output.files) {
    assert.doesNotMatch(file.content, /ghp_|sk-|BEGIN (RSA|OPENSSH|PRIVATE) KEY/);
  }
});


test("project generator creates readable Mermaid design documents and API contract", () => {
  const output = service.generate({
    name: "Customer Portal",
    stack: "next-nest",
    template: "saas-dashboard",
    architecturePreset: "local-first"
  });

  const contextDiagram = output.files.find((file) => file.path.endsWith("docs/context-diagram.md"));
  const systemDiagram = output.files.find((file) => file.path.endsWith("docs/system-diagram.md"));
  const deploymentDiagram = output.files.find((file) => file.path.endsWith("docs/deployment-diagram.md"));
  const apiContract = output.files.find((file) => file.path.endsWith("docs/api-contract.md"));

  assert.ok(contextDiagram?.content.includes("```mermaid"));
  assert.ok(systemDiagram?.content.includes("flowchart TB"));
  assert.ok(deploymentDiagram?.content.includes("Docker Compose"));
  assert.ok(apiContract?.content.includes("GET | /health"));
  assert.ok(output.validation.checks.includes("mermaid diagrams generated"));
  assert.ok(output.validation.checks.includes("api contract generated"));
});


test("project generator creates Git bootstrap and CI workflow files", () => {
  const output = service.generate({
    name: "Customer Portal",
    stack: "next-nest",
    template: "saas-dashboard",
    architecturePreset: "local-first"
  });

  const gitignore = output.files.find((file) => file.path.endsWith(".gitignore"));
  const ci = output.files.find((file) => file.path.endsWith(".github/workflows/ci.yml"));
  const initGit = output.files.find((file) => file.path.endsWith("scripts/init-git.sh"));

  assert.ok(gitignore?.content.includes(".env"));
  assert.ok(ci?.content.includes("actions/checkout@v4"));
  assert.ok(ci?.content.includes("npm ci"));
  assert.ok(initGit?.content.includes("git init"));
  assert.ok(initGit?.content.includes("chore: initialize generated project"));
  assert.ok(output.validation.checks.includes("git initialization script generated"));
  assert.ok(output.validation.checks.includes("ci workflow generated"));
});


test("project generator creates observability baseline files", () => {
  const output = service.generate({
    name: "Customer Portal",
    stack: "next-nest",
    template: "saas-dashboard",
    architecturePreset: "local-first"
  });

  const observability = output.files.find((file) => file.path.endsWith("apps/api/src/observability.ts"));
  const health = output.files.find((file) => file.path.endsWith("apps/api/src/health.ts"));
  const docs = output.files.find((file) => file.path.endsWith("docs/observability.md"));

  assert.ok(output.structure.includes("customer-portal/apps/api/src/observability.ts"));
  assert.ok(output.structure.includes("customer-portal/apps/api/src/health.ts"));
  assert.ok(output.structure.includes("customer-portal/docs/observability.md"));
  assert.ok(observability?.content.includes("request_id"));
  assert.ok(observability?.content.includes("trace_id"));
  assert.ok(observability?.content.includes("startOpenTelemetryBaseline"));
  assert.ok(observability?.content.includes("logStructured"));
  assert.ok(health?.content.includes("/health"));
  assert.ok(health?.content.includes("/ready"));
  assert.ok(health?.content.includes("/live"));
  assert.ok(docs?.content.includes("OpenTelemetry Baseline"));
  assert.ok(docs?.content.includes("Structured Logging"));
  assert.ok(output.validation.checks.includes("observability baseline generated"));
  assert.ok(output.validation.checks.includes("structured logging generated"));
  assert.ok(output.validation.checks.includes("health readiness liveness generated"));
});
