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
