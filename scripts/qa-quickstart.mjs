#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { QuickStartGeneratorService } = require("../apps/backend/dist/quickstart-generator.service.js");

const root = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), "goneops-quickstart-"));
const composeProject = `goneopsqa${process.pid}`.toLowerCase();
const portBase = 18000 + (process.pid % 1000);
const ports = {
  FRONTEND_APP_PORT: String(portBase),
  API_APP_PORT: String(portBase + 1),
  MYSQL_APP_PORT: String(portBase + 2),
  REDIS_APP_PORT: String(portBase + 3),
  RABBITMQ_APP_PORT: String(portBase + 4),
  RABBITMQ_UI_APP_PORT: String(portBase + 5)
};

function log(message) {
  console.log(`[qa:quickstart] ${message}`);
}

function run(command, options = {}) {
  log(`$ ${command}`);
  return execSync(command, { cwd: options.cwd ?? root, encoding: "utf8", stdio: options.stdio ?? "pipe", timeout: options.timeout ?? 120_000, env: { ...process.env, ...options.env } });
}

function docker(command, options = {}) {
  return run(`sg docker -c ${JSON.stringify(command)}`, options);
}

async function waitForJson(url, predicate, label, attempts = 180) {
  let last = "";
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      last = `${response.status} ${await response.text()}`;
      if (response.ok) {
        const json = JSON.parse(last.replace(/^\d+\s/, ""));
        if (predicate(json)) return json;
      }
    } catch (error) {
      last = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`${label} did not become ready. Last response: ${last}`);
}

async function waitForHttp200(url, label, attempts = 120) {
  let last = "";
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      last = String(response.status);
      if (response.status === 200) return;
    } catch (error) {
      last = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${label} did not return HTTP 200. Last response: ${last}`);
}

try {
  log("generate project through backend service API surface");
  const service = new QuickStartGeneratorService();
  const generated = service.generate({
    name: "GoneOps Demo",
    frontend: "Static HTML",
    backend: "ExpressJS",
    database: "MySQL",
    cache: "Redis",
    queue: "RabbitMQ",
    infrastructure: ["Redis", "RabbitMQ"],
    includeReadme: true,
    includeDockerCompose: true,
    includeCi: true,
    includeHelloWorld: true
  });

  assert.equal(generated.project.slug, "goneops-demo");
  assert.equal(generated.validation.valid, true);
  assert.equal(generated.automation.runtime, "Docker Compose");
  assert.equal(generated.automation.sourceControl, "Gitea");
  assert.equal(generated.automation.cicd, "Woodpecker CI");
  assert.equal(generated.automation.sandboxUrl, "/quickstart/projects/goneops-demo/sandbox");
  assert.ok(generated.automation.steps.some((step) => step.status === "requires_configuration"), "live Gitea/Woodpecker actions must be explicit when config is absent");

  const paths = generated.files.map((file) => file.path);
  for (const required of ["goneops-demo/README.md", "goneops-demo/.env.example", "goneops-demo/docker-compose.yml", "goneops-demo/.woodpecker.yml", "goneops-demo/scripts/local-cicd.sh", "goneops-demo/scripts/start-sandbox.sh", "goneops-demo/backend/src/server.js", "goneops-demo/frontend/index.html", "goneops-demo/database/seed.sql"]) {
    assert.ok(paths.includes(required), `missing generated file ${required}`);
  }
  assert.ok(!paths.some((path) => path.includes(".github/workflows")), "GitHub Actions workflow must not be generated");
  const allContent = generated.files.map((file) => file.content).join("\n");
  for (const marker of ["docker compose config --quiet", "docker compose build", "docker compose up -d --build", "mysql2", "createClient", "amqplib", "/health", "/jobs"]) {
    assert.ok(allContent.includes(marker), `missing generated marker ${marker}`);
  }

  log(`write generated project to ${tempRoot}`);
  for (const file of generated.files) {
    const output = join(tempRoot, relative("goneops-demo", file.path));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, file.content);
    if (file.path.includes("/scripts/")) chmodSync(output, 0o755);
  }
  const envPath = join(tempRoot, ".env");
  let env = generated.files.find((file) => file.path.endsWith(".env.example")).content;
  for (const [key, value] of Object.entries(ports)) env = env.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
  env = env.replace(/^DB_PASSWORD=.*$/m, "DB_PASSWORD=local-demo-password");
  env = env.replace(/^MINIO_ROOT_PASSWORD=.*$/m, "MINIO_ROOT_PASSWORD=local-demo-minio-password");
  writeFileSync(envPath, env);

  docker("docker compose config --quiet", { cwd: tempRoot, timeout: 120_000 });
  docker(`docker compose -p ${composeProject} up -d --build`, { cwd: tempRoot, timeout: 600_000, stdio: "inherit" });

  const health = await waitForJson(`http://127.0.0.1:${ports.API_APP_PORT}/health`, (json) => json.status === "ok" && json.database === true && json.redis === true && json.rabbitmq === true, "API health with MySQL/Redis/RabbitMQ connectivity");
  assert.deepEqual({ database: health.database, redis: health.redis, rabbitmq: health.rabbitmq }, { database: true, redis: true, rabbitmq: true });

  await waitForHttp200(`http://127.0.0.1:${ports.FRONTEND_APP_PORT}/`, "generated sandbox frontend");
  const createdResponse = await fetch(`http://127.0.0.1:${ports.API_APP_PORT}/jobs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Runtime QA Job" }) });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.title, "Runtime QA Job");
  const jobsResponse = await fetch(`http://127.0.0.1:${ports.API_APP_PORT}/jobs`);
  assert.equal(jobsResponse.status, 200);
  const jobs = await jobsResponse.json();
  assert.ok(jobs.some((job) => job.id === "demo-1"), "seeded MySQL job missing");
  assert.ok(jobs.some((job) => job.id === created.id), "created MySQL job missing");

  const ps = docker(`docker compose -p ${composeProject} ps --format json`, { cwd: tempRoot, timeout: 120_000 });
  assert.ok(ps.includes("api"), "docker compose ps should include api service");
  assert.ok(ps.includes("mysql"), "docker compose ps should include mysql service");
  assert.ok(ps.includes("redis"), "docker compose ps should include redis service");
  assert.ok(ps.includes("rabbitmq"), "docker compose ps should include rabbitmq service");

  log("PASS: generation, file validation, Docker Compose, sandbox HTTP 200, MySQL, Redis, RabbitMQ, jobs endpoint");
} finally {
  try { docker(`docker compose -p ${composeProject} logs --no-color --tail=120`, { cwd: tempRoot, timeout: 120_000 }); } catch {}
  try { docker(`docker compose -p ${composeProject} down -v --remove-orphans`, { cwd: tempRoot, timeout: 180_000, stdio: "inherit" }); } catch {}
  if (!process.env.GONEOPS_KEEP_QA_PROJECT) rmSync(tempRoot, { recursive: true, force: true });
}
