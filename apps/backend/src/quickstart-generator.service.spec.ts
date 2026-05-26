import * as assert from "node:assert/strict";
import { test } from "node:test";
import { QuickStartGeneratorService } from "./quickstart-generator.service";

const service = new QuickStartGeneratorService();

const allCombos = [
  { frontend: "NextJS", backend: "Go Fiber", database: "PostgreSQL", infrastructure: ["Redis", "RabbitMQ"] },
  { frontend: "React", backend: "NestJS", database: "MySQL", infrastructure: ["Redis", "MinIO"] },
  { frontend: "Vue", backend: "ExpressJS", database: "MongoDB", infrastructure: ["RabbitMQ"] },
  { frontend: "Static HTML", backend: "FastAPI", database: "PostgreSQL", infrastructure: ["Redis", "RabbitMQ", "MinIO"] }
] as const;

test("quickstart options expose real MVP stack components", () => {
  const options = service.getOptions();
  assert.equal(options.edition, "GoneOps QuickStart Edition");
  assert.equal(options.goal, "One Click Project Bootstrap");
  assert.deepEqual(options.flow, ["select stack", "generate project", "create Gitea repo", "push project", "trigger Woodpecker CI", "build containers", "start sandbox", "open sandbox URL"]);
  assert.equal(options.localPlatform.sourceControl, "Gitea");
  assert.equal(options.localPlatform.cicd, "Woodpecker CI");
  for (const component of ["NextJS", "React", "Vue", "Static HTML", "Go Fiber", "NestJS", "ExpressJS", "FastAPI", "PostgreSQL", "MySQL", "MongoDB", "Redis", "RabbitMQ", "MinIO"]) {
    assert.ok(JSON.stringify(options).includes(component), component);
  }
});

test("quickstart generator creates real runnable project outputs for representative stack combinations", () => {
  for (const combo of allCombos) {
    const output = service.generate({ name: `${combo.backend} ${combo.database}`, frontend: combo.frontend, backend: combo.backend, database: combo.database, infrastructure: [...combo.infrastructure] });
    assert.equal(output.edition, "GoneOps QuickStart Edition");
    assert.equal(output.validation.valid, true);
    assert.ok(output.stackSummary.includes(combo.backend));
    assert.ok(output.swaggerUrl.includes("/swagger"));

    const required = ["README.md", "docker-compose.yml", ".woodpecker.yml", ".env.example", "Makefile", "openapi.yaml", "backend/Dockerfile", "frontend/Dockerfile", "scripts/healthcheck.sh", "scripts/local-cicd.sh", "scripts/start-sandbox.sh"];
    for (const path of required) assert.ok(output.files.some((file) => file.path.endsWith(path)), `${combo.backend} missing ${path}`);

    const joined = output.files.map((file) => file.content).join("\n");
    for (const marker of ["/health", "/swagger", "/users", "/redis/set", "/redis/get", "/rabbitmq/publish", "/rabbitmq/consume", "Create User", "Delete User", combo.database, "PROJECT_SLUG", "docker compose up -d --build", "Woodpecker", "docker compose config --quiet", "${API_APP_PORT", "${API_PORT"]) {
      assert.ok(joined.includes(marker), `${combo.backend} missing ${marker}`);
    }
  }
});

test("go fiber postgres redis rabbitmq example includes demo workflow and credentials", () => {
  const output = service.generate({ name: "Demo Job Flow", frontend: "Static HTML", backend: "Go Fiber", database: "PostgreSQL", infrastructure: ["Redis", "RabbitMQ"] });
  assert.deepEqual(output.generatedServices, ["frontend", "api", "postgres", "redis", "rabbitmq"]);
  assert.ok(output.stackSummary.includes("Go Fiber"));
  assert.ok(output.generatedServices.includes("postgres"));
  assert.ok(output.containerStatus.some((item) => item.service === "api"));
  assert.ok(output.ports.some((item) => item.name === "Backend API"));
  assert.ok(output.urls.some((item) => item.name === "Swagger"));
  assert.ok(output.credentials.some((item) => item.service === "PostgreSQL"));
  assert.ok(output.apiExamples.some((item) => item.includes("POST")));
  assert.ok(output.dockerCommands.includes("docker compose up -d --build"));
  assert.equal(output.automation.sourceControl, "Gitea");
  assert.equal(output.automation.cicd, "Woodpecker CI");
  assert.equal(output.automation.runtime, "Docker Compose");
  assert.equal(output.automation.sandboxUrl, "/quickstart/projects/demo-job-flow/sandbox");
  assert.ok(output.automation.logs.some((line) => line.includes("Create Gitea repository")));
  const readme = output.files.find((file) => file.path.endsWith("README.md"))?.content ?? "";
  assert.ok(readme.includes("PostgreSQL"));
  assert.ok(readme.includes("RabbitMQ"));
  assert.ok(readme.includes("user=demo_job_flow_user password=apppassword"));
  const env = output.files.find((file) => file.path.endsWith(".env.example"))?.content ?? "";
  assert.ok(env.includes("PROJECT_SLUG=demo-job-flow"));
  assert.ok(env.includes("DB_NAME=demo_job_flow_db"));
});

test("quickstart lists projects and deletes only after exact name confirmation", () => {
  const scopedService = new QuickStartGeneratorService();
  const output = scopedService.generate({ name: "Delete Me", frontend: "Static HTML", backend: "ExpressJS", database: "None", infrastructure: [] });
  assert.ok(scopedService.listProjects().some((project) => project.slug === "delete-me"));
  assert.throws(() => scopedService.deleteProject(output.project.slug, { confirmationName: "wrong" }), /Confirmation name must match project name/);
  assert.ok(scopedService.getProject(output.project.slug));
  assert.deepEqual(scopedService.deleteProject(output.project.slug, { confirmationName: "Delete Me" }), { deleted: true, slug: "delete-me" });
  assert.equal(scopedService.getProject(output.project.slug), undefined);
  assert.ok(!scopedService.listProjects().some((project) => project.slug === "delete-me"));
});

test("quickstart rejects unsupported components", () => {
  assert.throws(() => service.generate({ name: "Bad", backend: "Rails" as never }), /Unsupported QuickStart backend/);
  assert.throws(() => service.generate({ name: "Bad", database: "Oracle" as never }), /Unsupported QuickStart database/);
});

test("quickstart generated files avoid excluded advanced platform features and secrets", () => {
  const output = service.generate({ name: "Clean DX", frontend: "Static HTML", backend: "ExpressJS", database: "PostgreSQL", infrastructure: ["Redis", "RabbitMQ"] });
  const joined = output.files.map((file) => file.content).join("\n");
  for (const forbidden of ["AI workspace", "memory engine", "observability dashboard", "workflow engine", "task engine", "runtime management"]) {
    assert.doesNotMatch(joined, new RegExp(forbidden, "i"));
  }
  assert.doesNotMatch(joined, /ghp_|sk-[A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE) KEY/);
});

test("quickstart replaces GitHub Actions with local Gitea and Woodpecker CI output", () => {
  const output = service.generate({ name: "Local Vercel", frontend: "Static HTML", backend: "ExpressJS", database: "PostgreSQL", infrastructure: ["Redis"] });
  const paths = output.files.map((file) => file.path);
  assert.ok(paths.some((path) => path.endsWith(".woodpecker.yml")));
  assert.ok(!paths.some((path) => path.includes(".github/workflows")));
  const joined = output.files.map((file) => file.content).join("\n");
  assert.ok(joined.includes("docker compose build"));
  assert.ok(joined.includes("docker compose up -d --build"));
  assert.ok(output.automation.repositoryUrl.includes("gitea") || output.automation.repositoryUrl.includes("localhost:3001"));
  assert.ok(output.automation.pipelineUrl.includes("localhost:8000"));
});

test("express mysql quickstart exposes real runtime operation controls and dynamic resource names", () => {
  const output = service.generate({ name: "GoneOps Demo", frontend: "Static HTML", backend: "ExpressJS", database: "MySQL", infrastructure: ["Redis", "RabbitMQ"] });
  const env = output.files.find((file) => file.path.endsWith(".env.example"))?.content ?? "";
  const compose = output.files.find((file) => file.path.endsWith("docker-compose.yml"))?.content ?? "";
  const server = output.files.find((file) => file.path.endsWith("backend/src/server.js"))?.content ?? "";
  const frontend = output.files.find((file) => file.path.endsWith("frontend/index.html"))?.content ?? "";

  assert.ok(env.includes("PROJECT_SLUG=goneops-demo"));
  assert.ok(env.includes("DB_NAME=goneops_demo_db"));
  assert.ok(env.includes("DB_USER=goneops_demo_user"));
  for (const container of ["goneops-demo-frontend", "goneops-demo-api", "goneops-demo-mysql", "goneops-demo-redis", "goneops-demo-rabbitmq"]) {
    assert.ok(compose.includes(`container_name: ${container}`), `missing dynamic container ${container}`);
  }
  for (const endpoint of ["/health", "/users", "/users/:id", "/redis/set", "/redis/get", "/rabbitmq/publish", "/rabbitmq/consume", "/rabbitmq/logs"]) {
    assert.ok(server.includes(endpoint), `missing backend endpoint ${endpoint}`);
  }
  for (const button of ["Health Check", "Create User", "List Users", "Delete User", "Redis SET", "Redis GET", "RabbitMQ Publish", "RabbitMQ Consume/Logs"]) {
    assert.ok(frontend.includes(button), `missing frontend control ${button}`);
  }
  assert.doesNotMatch(frontend, /mock|simulat/i);
});
