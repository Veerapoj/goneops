import * as assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { test } from "node:test";
import { QuickStartGeneratorService } from "./quickstart-generator.service";

const service = new QuickStartGeneratorService();

test("quickstart options expose one click bootstrap flow", () => {
  const options = service.getOptions();
  assert.equal(options.edition, "GoneOps QuickStart Edition");
  assert.equal(options.goal, "One Click Project Bootstrap");
  assert.deepEqual(options.flow, ["select stack", "click generate", "run local project"]);
  assert.ok(options.stacks.some((stack) => stack.id === "node-http"));
});

test("quickstart generator creates a clean runnable local project", () => {
  const output = service.generate({ name: "Hello Local", stack: "node-http" });
  assert.equal(output.edition, "GoneOps QuickStart Edition");
  assert.equal(output.project.slug, "hello-local");
  assert.equal(output.validation.valid, true);

  const required = ["README.md", "package.json", ".env.example", "src/server.js", "Dockerfile", "docker-compose.yml"];
  for (const path of required) {
    assert.ok(output.files.some((file) => file.path.endsWith(path)), path);
  }

  const server = output.files.find((file) => file.path.endsWith("src/server.js"))?.content ?? "";
  const env = output.files.find((file) => file.path.endsWith(".env.example"))?.content ?? "";
  const compose = output.files.find((file) => file.path.endsWith("docker-compose.yml"))?.content ?? "";
  assert.ok(server.includes("/hello"));
  assert.ok(server.includes("process.env.PORT"));
  assert.ok(env.includes("PORT="));
  assert.ok(env.includes("APP_PORT="));
  assert.ok(compose.includes("${APP_PORT"));
  assert.ok(compose.includes("${PORT"));
});

test("quickstart rejects unsupported stacks", () => {
  assert.throws(() => service.generate({ name: "Bad", stack: "kubernetes-ai" as never }), /Unsupported QuickStart stack/);
});

test("quickstart generated project builds and exposes hello world locally", async () => {
  const output = service.generate({ name: "Runnable Local", stack: "node-service" });
  const root = mkdtempSync(join(tmpdir(), "goneops-quickstart-"));
  const slug = output.project.slug;
  const projectRoot = join(root, slug);

  for (const file of output.files) {
    const relative = file.path.replace(`${slug}/`, "");
    const target = join(projectRoot, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
  }
  copyFileSync(join(projectRoot, ".env.example"), join(projectRoot, ".env"));

  const build = spawnSync("npm", ["run", "build"], { cwd: projectRoot, encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr || build.stdout);

  const app = spawn("node", ["src/server.js"], {
    cwd: projectRoot,
    env: { ...process.env, PORT: "4199" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    let hello: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const response = await fetch("http://127.0.0.1:4199/hello");
        hello = await response.json();
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    assert.deepEqual(hello, {
      message: "Hello World from GoneOps QuickStart Edition",
      stack: "node-service",
      service: "Node Service API"
    });
  } finally {
    app.kill();
  }
});

test("quickstart generated files avoid excluded advanced platform features", () => {
  const output = service.generate({ name: "Clean DX", stack: "node-worker-api" });
  const joined = output.files.map((file) => file.content).join("\n");
  for (const forbidden of ["AI workspace", "memory engine", "observability dashboard", "workflow engine", "task engine", "runtime management"]) {
    assert.doesNotMatch(joined, new RegExp(forbidden, "i"));
  }
  assert.doesNotMatch(joined, /ghp_|sk-|BEGIN (RSA|OPENSSH|PRIVATE) KEY/);
});
