import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const backendPort = process.env.E2E_BACKEND_PORT ?? "4200";
const frontendPort = process.env.E2E_FRONTEND_PORT ?? "3200";
const backendUrl = `http://127.0.0.1:${backendPort}`;
const frontendUrl = `http://127.0.0.1:${frontendPort}`;
const runtimeLog = "/tmp/goneops-e2e-runtime.log";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe", ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return result.stdout?.trim() ?? "";
}

async function waitFor(url, timeoutMs = 30000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function startProcess(command, args, env, logTarget) {
  const proc = spawn(command, args, {
    env: { ...process.env, ...env },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  proc.stdout.on("data", (data) => logTarget.push(data.toString()));
  proc.stderr.on("data", (data) => logTarget.push(data.toString()));
  return proc;
}

async function stopProcess(proc) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
  try {
    process.kill(-proc.pid, "SIGTERM");
  } catch {
    proc.kill("SIGTERM");
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (proc.exitCode === null && proc.signalCode === null) {
    try {
      process.kill(-proc.pid, "SIGKILL");
    } catch {
      proc.kill("SIGKILL");
    }
  }
}

function parseJsonLog(logs, eventName) {
  for (const line of logs.join("").split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.event === eventName) return parsed;
    } catch {
      // Ignore non-JSON framework output.
    }
  }
  return null;
}

function secretScan() {
  const tracked = run("git", ["ls-files"]).split("\n").filter(Boolean);
  const untracked = run("git", ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
  const pattern = /(ghp_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|OPENSSH|PRIVATE) KEY)/;
  const violations = [];
  for (const rel of [...new Set([...tracked, ...untracked])].sort()) {
    if (rel === "package-lock.json") continue;
    if (!existsSync(rel)) continue;
    const text = run("python3", ["-c", `from pathlib import Path; print(Path(${JSON.stringify(rel)}).read_text(errors='ignore'), end='')`]);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (rel === "logs/phase-3-design-generator.md" && line.toLowerCase().includes("false positive")) return;
      if (line.includes("ghp_|sk-|BEGIN (RSA|OPENSSH|PRIVATE) KEY")) return;
      if (pattern.test(line)) violations.push(`${rel}:${index + 1}:${line.slice(0, 120)}`);
    });
  }
  assert.deepEqual(violations, []);
}

async function main() {
  run("npm", ["run", "qa:mvp"], { stdio: "inherit" });

  const logs = [];
  const backend = startProcess("npm", ["--workspace", "apps/backend", "start"], { BACKEND_PORT: backendPort }, logs);
  const frontend = startProcess("npm", ["--workspace", "apps/frontend", "start"], { FRONTEND_PORT: frontendPort }, logs);

  let tempRoot;
  try {
    await waitFor(`${backendUrl}/health`);
    await waitFor(`${frontendUrl}/`);

    const healthHeaders = { "x-request-id": "e2e-health" };
    for (const endpoint of ["/health", "/ready", "/live"]) {
      const response = await fetch(`${backendUrl}${endpoint}`, { headers: healthHeaders });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.status, "ok");
      assert.equal(body.request_id, "e2e-health");
      assert.ok(body.trace_id);
    }

    const options = await (await fetch(`${backendUrl}/projects/options`)).json();
    assert.ok(options.stacks.includes("next-nest"));
    assert.ok(options.templates.includes("saas-dashboard"));
    assert.ok(options.architecturePresets.includes("local-first"));

    const generateResponse = await fetch(`${backendUrl}/projects/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-request-id": "e2e-generate" },
      body: JSON.stringify({
        name: "E2E Customer Portal",
        stack: "next-nest",
        template: "saas-dashboard",
        architecturePreset: "local-first"
      })
    });
    assert.equal(generateResponse.status, 201);
    const generated = await generateResponse.json();
    assert.equal(generated.validation.valid, true);
    assert.equal(generated.project.slug, "e2e-customer-portal");

    const requiredSuffixes = [
      "README.md",
      "docker-compose.yml",
      ".env.example",
      "docs/architecture.md",
      "docs/context-diagram.md",
      "docs/system-diagram.md",
      "docs/deployment-diagram.md",
      "docs/api-contract.md",
      ".gitignore",
      ".github/workflows/ci.yml",
      "scripts/init-git.sh",
      "apps/api/src/observability.ts",
      "apps/api/src/health.ts",
      "docs/observability.md"
    ];
    for (const suffix of requiredSuffixes) {
      assert.ok(generated.files.some((file) => file.path.endsWith(suffix)), `missing generated ${suffix}`);
    }

    tempRoot = await mkdtemp(path.join(tmpdir(), "goneops-e2e-"));
    for (const file of generated.files) {
      const outputPath = path.join(tempRoot, file.path);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, file.content);
    }
    const projectRoot = path.join(tempRoot, generated.project.slug);
    const yamlCheck = run("python3", ["-c", "import pathlib, yaml; yaml.safe_load(pathlib.Path('.github/workflows/ci.yml').read_text()); print('ci yaml ok')"], { cwd: projectRoot });
    assert.equal(yamlCheck, "ci yaml ok");
    const transpileCheck = run("node", ["-e", "const fs=require('fs'); const path=require('path'); const ts=require('typescript'); const root=process.env.PROJECT_ROOT; for (const f of ['apps/api/src/observability.ts','apps/api/src/health.ts']) { const r=ts.transpileModule(fs.readFileSync(path.join(root,f),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }}); if (r.diagnostics?.length) throw new Error(f); } console.log('ts ok')"], { env: { ...process.env, PROJECT_ROOT: projectRoot } });
    assert.equal(transpileCheck, "ts ok");
    run("git", ["config", "--global", "--add", "safe.directory", projectRoot]);
    run("bash", ["scripts/init-git.sh"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "GoneOps E2E",
        GIT_AUTHOR_EMAIL: "goneops@example.local",
        GIT_COMMITTER_NAME: "GoneOps E2E",
        GIT_COMMITTER_EMAIL: "goneops@example.local"
      }
    });
    const commitSubject = run("git", ["log", "-1", "--pretty=%s"], { cwd: projectRoot });
    assert.equal(commitSubject, "chore: initialize generated project");

    const page = await (await fetch(`${frontendUrl}/`)).text();
    for (const token of [
      "Phase 6 — UI Polish",
      "Project Generator",
      "Design Generator Preview",
      "Git + CI/CD Preview",
      "Observability Baseline Preview",
      "UI Polish QA Checklist",
      "Dark mode ready",
      "Coming Soon"
    ]) {
      assert.ok(page.includes(token), `frontend missing ${token}`);
    }
    const missingPage = await fetch(`${frontendUrl}/e2e-no-page`);
    assert.equal(missingPage.status, 404);

    const structuredLog = parseJsonLog(logs, "http_request_completed");
    assert.ok(structuredLog, "missing structured request log");
    assert.ok(structuredLog.request_id, "structured log missing request_id");
    assert.ok(structuredLog.trace_id, "structured log missing trace_id");

    run("sg", ["docker", "-c", "docker compose config --quiet && docker compose ps --format json"], { stdio: "pipe" });
    secretScan();

    await writeFile(runtimeLog, logs.join(""));
    console.log(JSON.stringify({
      status: "passed",
      backendUrl,
      frontendUrl,
      generatedFiles: generated.files.length,
      generatedProject: generated.project.slug,
      runtimeLog
    }, null, 2));
  } finally {
    await stopProcess(backend);
    await stopProcess(frontend);
    if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
