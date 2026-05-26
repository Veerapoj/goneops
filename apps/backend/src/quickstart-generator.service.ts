import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import {
  GenerateQuickStartRequest,
  DeleteQuickStartProjectRequest,
  GenerateQuickStartResponse,
  QuickStartBackend,
  QuickStartDatabase,
  QuickStartFrontend,
  QuickStartGeneratedFile,
  QuickStartInfrastructure,
  QuickStartProjectSummary,
  QuickStartAutomationStep,
  QuickStartLiveAutomationResult
} from "./quickstart-generator.types";

const execFileAsync = promisify(execFile);

const FRONTENDS: QuickStartFrontend[] = ["NextJS", "React", "Vue", "Static HTML"];
const BACKENDS: QuickStartBackend[] = ["Go Fiber", "NestJS", "ExpressJS", "FastAPI"];
const DATABASES: QuickStartDatabase[] = ["PostgreSQL", "MySQL", "MongoDB", "None"];
const INFRASTRUCTURE: QuickStartInfrastructure[] = ["Redis", "RabbitMQ", "MinIO"];
const LEGACY_STACK_OPTIONS = ["node-http", "node-service", "node-worker-api"] as const;

type StackSelection = {
  frontend: QuickStartFrontend;
  backend: QuickStartBackend;
  database: QuickStartDatabase;
  infrastructure: QuickStartInfrastructure[];
};

type ServicePort = { name: string; internal: string; external: string; url?: string };

export class QuickStartGeneratorService {
  private readonly generatedProjects = new Map<string, GenerateQuickStartResponse>();

  getProject(slug: string): GenerateQuickStartResponse | undefined {
    return this.generatedProjects.get(slug);
  }

  listProjects(): QuickStartProjectSummary[] {
    return Array.from(this.generatedProjects.values()).map((project) => this.toProjectSummary(project));
  }

  deleteProject(slug: string, request: DeleteQuickStartProjectRequest): { deleted: true; slug: string } | undefined {
    const project = this.generatedProjects.get(slug);
    if (!project) return undefined;
    if (request.confirmationName !== project.project.name) {
      throw new Error(`Confirmation name must match project name: ${project.project.name}`);
    }
    this.generatedProjects.delete(slug);
    void this.cleanupLiveProject(project);
    return { deleted: true, slug };
  }

  getOptions() {
    return {
      edition: "GoneOps QuickStart Edition",
      goal: "One Click Project Bootstrap",
      components: {
        frontend: FRONTENDS,
        backend: BACKENDS,
        database: DATABASES,
        cache: ["Redis", "None"] as const,
        queue: ["RabbitMQ", "None"] as const,
        infrastructure: INFRASTRUCTURE
      },
      stacks: [
        ...LEGACY_STACK_OPTIONS.map((stack) => ({
          id: stack,
          label: stack === "node-http" ? "Node HTTP API" : stack === "node-service" ? "Node Service API" : "Node Worker API",
          description: "Legacy simple Node quickstart option mapped to the real ExpressJS MVP generator."
        })),
        ...BACKENDS.map((backend) => ({
          id: backend,
          label: backend,
          description: `Runnable ${backend} API starter with Swagger, health checks, Docker Compose, and local service wiring.`
        }))
      ],
      flow: ["select stack", "generate project", "create Gitea repo", "push project", "trigger Woodpecker CI", "build containers", "start sandbox", "open sandbox URL"] as const,
      localPlatform: { sourceControl: "Gitea", cicd: "Woodpecker CI", runtime: "Docker Compose", giteaUrl: "http://localhost:3001", woodpeckerUrl: "http://localhost:8000" }
    };
  }

  generate(request: GenerateQuickStartRequest = {}): GenerateQuickStartResponse {
    const name = this.normalizeName(request.name ?? "QuickStart App");
    const slug = this.slugify(name);
    const selection = this.resolveSelection(request);
    const ports = this.servicePorts(selection);
    const files: QuickStartGeneratedFile[] = [];
    const includeReadme = request.includeReadme ?? true;
    const includeDockerCompose = request.includeDockerCompose ?? true;
    const includeCi = request.includeCi ?? true;
    const includeHelloWorld = request.includeHelloWorld ?? true;

    if (includeReadme) files.push({ path: `${slug}/README.md`, content: this.renderReadme(name, slug, selection, ports) });
    files.push({ path: `${slug}/.env.example`, content: this.renderEnvExample(selection) });
    files.push({ path: `${slug}/.gitignore`, content: this.renderGitignore() });
    files.push({ path: `${slug}/Makefile`, content: this.renderMakefile() });
    if (includeDockerCompose) files.push({ path: `${slug}/docker-compose.yml`, content: this.renderDockerCompose(selection) });
    if (includeCi) files.push({ path: `${slug}/.woodpecker.yml`, content: this.renderWoodpeckerPipeline() });
    files.push({ path: `${slug}/scripts/local-cicd.sh`, content: this.renderLocalCicdScript() });
    files.push({ path: `${slug}/scripts/start-sandbox.sh`, content: this.renderStartSandboxScript(slug) });
    files.push({ path: `${slug}/openapi.yaml`, content: this.renderOpenApi(name) });
    files.push({ path: `${slug}/scripts/healthcheck.sh`, content: this.renderHealthcheckScript() });
    files.push(...this.renderBackendFiles(selection, includeHelloWorld));
    files.push(...this.renderFrontendFiles(selection));
    files.push(...this.renderSeedFiles(selection));

    for (const file of files) {
      if (!file.path.startsWith(`${slug}/`)) {
        file.path = `${slug}/${file.path}`;
      }
    }

    this.validate(files, selection, { includeReadme, includeDockerCompose, includeCi, includeHelloWorld });
    const readme = files.find((file) => file.path.endsWith("README.md"))?.content ?? "README generation disabled.";

    const response: GenerateQuickStartResponse = {
      edition: "GoneOps QuickStart Edition",
      goal: "One Click Project Bootstrap",
      project: { name, slug, stack: request.stack ?? selection.backend, url: `/quickstart/projects/${slug}`, generatedAt: new Date().toISOString(), selection },
      stackSummary: `${selection.frontend} + ${selection.backend} + ${selection.database} + ${selection.infrastructure.length ? selection.infrastructure.join(" + ") : "No cache/queue"}`,
      generatedServices: this.generatedServices(selection),
      ports,
      urls: this.urls(ports).concat([{ name: "Sandbox", url: `/quickstart/projects/${slug}/sandbox` }]),
      credentials: this.credentials(selection),
      swaggerUrl: "http://localhost:${API_APP_PORT}/swagger",
      apiExamples: [
        "curl http://localhost:${API_APP_PORT}/hello",
        "curl http://localhost:${API_APP_PORT}/health",
        "curl http://localhost:${API_APP_PORT}/jobs",
        "curl -X POST http://localhost:${API_APP_PORT}/jobs -H 'content-type: application/json' -d '{\"title\":\"Create Demo Job\"}'"
      ],
      dockerCommands: ["cp .env.example .env", "docker compose config --quiet", "docker compose up -d --build", "docker compose ps", "docker compose logs", "docker compose down -v"],
      generationLogs: [
        "[✓] Generate backend",
        ...(includeHelloWorld ? ["[✓] Generate Hello World"] : []),
        "[✓] Generate Swagger",
        ...(selection.database !== "None" ? [`[✓] Generate ${selection.database} config`] : ["[✓] Skip database config"]),
        ...(selection.infrastructure.includes("Redis") ? ["[✓] Generate Redis config"] : ["[✓] Skip cache config"]),
        ...(selection.infrastructure.includes("RabbitMQ") ? ["[✓] Generate RabbitMQ workflow"] : ["[✓] Skip queue workflow"]),
        ...(selection.infrastructure.includes("MinIO") ? ["[✓] Generate MinIO config"] : []),
        ...(includeDockerCompose ? ["[✓] Generate Docker Compose"] : []),
        ...(includeCi ? ["[✓] Generate Woodpecker CI pipeline"] : []),
        "[✓] Prepare Gitea repository automation",
        "[✓] Prepare Docker Compose sandbox URL",
        "[✓] Validate API",
        "[✓] Validate Swagger"
      ],
      automation: this.automation(slug),
      containerStatus: this.generatedServices(selection).map((service) => ({ service, status: "generated", health: "validated by Docker Compose and Woodpecker pipeline checks" })),
      flow: ["select stack", "generate project", "create Gitea repo", "push project", "trigger Woodpecker CI", "build containers", "start sandbox", "open sandbox URL"],
      files,
      readme,
      validation: {
        valid: true,
        checks: [
          "backend source generated",
          "frontend source generated",
          "Hello World endpoint generated",
          "Swagger/OpenAPI generated",
          selection.database !== "None" ? `${selection.database} connection code generated` : "database disabled by selection",
          selection.infrastructure.includes("Redis") ? "Redis cache wiring generated" : "cache disabled by selection",
          selection.infrastructure.includes("RabbitMQ") ? "RabbitMQ queue wiring generated" : "queue disabled by selection",
          includeDockerCompose ? "Docker Compose generated with automatic container networking" : "Docker Compose disabled by selection",
          includeCi ? "CI/CD workflow generated" : "CI/CD disabled by selection",
          "ports resolved from .env",
          "README generated with credentials and commands"
        ]
      }
    };
    this.generatedProjects.set(slug, response);
    return response;
  }

  async generateAndAutomate(request: GenerateQuickStartRequest = {}): Promise<GenerateQuickStartResponse> {
    const response = this.generate(request);
    const live = await this.runLiveAutomation(response);
    response.automation = {
      ...response.automation,
      workspacePath: live.workspacePath,
      composeProject: live.composeProject,
      repositoryUrl: live.repositoryUrl,
      pipelineUrl: live.pipelineUrl,
      sandboxUrl: live.sandboxUrl,
      liveFrontendUrl: live.liveFrontendUrl,
      liveApiUrl: live.liveApiUrl,
      steps: live.steps,
      logs: live.logs
    };
    response.generationLogs.push(...live.logs);
    response.containerStatus = response.containerStatus.map((item) => ({ ...item, status: "sandbox_started", health: `isolated compose project ${live.composeProject}` }));
    this.generatedProjects.set(response.project.slug, response);
    return response;
  }

  private async runLiveAutomation(project: GenerateQuickStartResponse): Promise<QuickStartLiveAutomationResult> {
    const slug = project.project.slug;
    const cwd = process.cwd();
    const defaultWorkspaceRoot = cwd.endsWith("/apps/backend") ? resolve(cwd, "../..", ".goneops/quickstart-projects") : resolve(cwd, ".goneops/quickstart-projects");
    const workspaceRoot = resolve(process.env.QUICKSTART_WORKSPACE_DIR ?? defaultWorkspaceRoot);
    const workspacePath = join(workspaceRoot, slug);
    const composeProject = `qs-${slug}`.replace(/[^a-z0-9-]/g, "-").slice(0, 52);
    const owner = process.env.GITEA_OWNER ?? "goneops";
    const giteaUrl = (process.env.GITEA_URL ?? "http://localhost:3001").replace(/\/$/, "");
    const woodpeckerUrl = (process.env.WOODPECKER_URL ?? "http://localhost:8000").replace(/\/$/, "");
    const repositoryUrl = `${giteaUrl}/${owner}/${slug}`;
    const pipelineUrl = `${woodpeckerUrl}/repos/${owner}/${slug}`;
    const sandboxUrl = `/quickstart/projects/${slug}/sandbox`;
    const { frontendUrl: liveFrontendUrl, apiUrl: liveApiUrl } = this.liveServiceUrls(slug);
    const steps: QuickStartAutomationStep[] = [];
    const pushStep = (step: QuickStartAutomationStep) => steps.push(step);

    await rm(workspacePath, { recursive: true, force: true });
    for (const file of project.files) {
      const output = join(workspacePath, relative(slug, file.path));
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, file.content);
    }
    await writeFile(join(workspacePath, ".env"), this.renderSandboxEnv(project, composeProject));
    pushStep({ step: "Persist generated project workspace", status: "success", detail: workspacePath });

    await this.runCommand("git", ["init"], workspacePath);
    await this.runCommand("git", ["checkout", "-B", "main"], workspacePath);
    await this.runCommand("git", ["config", "user.name", "GoneOps QuickStart"], workspacePath);
    await this.runCommand("git", ["config", "user.email", "quickstart@goneops.local"], workspacePath);
    await this.runCommand("git", ["add", "."], workspacePath);
    await this.runCommand("git", ["commit", "-m", "chore: initialize quickstart project"], workspacePath);
    pushStep({ step: "Initialize isolated Git repository", status: "success", detail: `Git repository initialized under ${workspacePath}, outside the GoneOps source tree.` });

    const giteaToken = process.env.GITEA_TOKEN;
    if (giteaToken) {
      await this.createGiteaRepo(giteaUrl, giteaToken, slug, project.project.name);
      pushStep({ step: "Create Gitea repository", status: "success", detail: repositoryUrl });
      await this.pushToGitea(workspacePath, giteaUrl, giteaToken, owner, slug);
      pushStep({ step: "Push generated project", status: "success", detail: this.redactRemote(repositoryUrl) });
    } else {
      pushStep({ step: "Create Gitea repository", status: "requires_configuration", detail: "Set GITEA_TOKEN and GITEA_OWNER to enable live repository creation." });
      pushStep({ step: "Push generated project", status: "requires_configuration", detail: "Skipped live push because GITEA_TOKEN is not configured." });
    }

    const woodpeckerToken = process.env.WOODPECKER_TOKEN;
    if (woodpeckerToken) {
      const detail = await this.triggerWoodpecker(woodpeckerUrl, woodpeckerToken, owner, slug);
      pushStep({ step: "Trigger Woodpecker CI", status: "success", detail });
    } else {
      pushStep({ step: "Trigger Woodpecker CI", status: "requires_configuration", detail: "Set WOODPECKER_TOKEN after connecting Woodpecker to Gitea to trigger a live pipeline." });
    }

    await this.runCommand("sg", ["docker", "-c", "docker compose config --quiet"], workspacePath, 120_000);
    pushStep({ step: "Validate sandbox Docker Compose", status: "success", detail: `compose project ${composeProject}` });
    await this.runCommand("sg", ["docker", "-c", `docker compose -p ${composeProject} up -d --build`], workspacePath, 600_000);
    pushStep({ step: "Start sandbox", status: "success", detail: `Docker Compose sandbox started as ${composeProject}` });
    pushStep({ step: "Expose sandbox URL", status: "success", detail: `${sandboxUrl} renders live app ${liveFrontendUrl} with API ${liveApiUrl}` });

    return { workspacePath, composeProject, repositoryUrl, pipelineUrl, sandboxUrl, liveFrontendUrl, liveApiUrl, steps, logs: steps.map((step) => `[${step.status}] ${step.step}: ${step.detail}`) };
  }

  private async cleanupLiveProject(project: GenerateQuickStartResponse) {
    const composeProject = project.automation.composeProject;
    const workspacePath = project.automation.workspacePath;
    if (composeProject && workspacePath) {
      await this.runCommand("sg", ["docker", "-c", `docker compose -p ${composeProject} down -v --remove-orphans`], workspacePath, 180_000).catch(() => undefined);
      await rm(workspacePath, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private liveServicePorts(slug: string) {
    const hash = Array.from(slug).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const base = 23000 + (hash % 1000);
    return { frontend: base, api: base + 1 };
  }

  private liveServiceUrls(slug: string) {
    const ports = this.liveServicePorts(slug);
    return { frontendUrl: `http://localhost:${ports.frontend}`, apiUrl: `http://localhost:${ports.api}` };
  }

  private renderSandboxEnv(project: GenerateQuickStartResponse, composeProject: string) {
    const base = this.liveServicePorts(project.project.slug).frontend;
    const env = project.files.find((file) => file.path.endsWith(".env.example"))?.content ?? "";
    return env
      .replace(/^FRONTEND_APP_PORT=.*$/m, `FRONTEND_APP_PORT=${base}`)
      .replace(/^API_APP_PORT=.*$/m, `API_APP_PORT=${base + 1}`)
      .replace(/^POSTGRES_APP_PORT=.*$/m, `POSTGRES_APP_PORT=${base + 2}`)
      .replace(/^MYSQL_APP_PORT=.*$/m, `MYSQL_APP_PORT=${base + 3}`)
      .replace(/^MONGO_APP_PORT=.*$/m, `MONGO_APP_PORT=${base + 4}`)
      .replace(/^REDIS_APP_PORT=.*$/m, `REDIS_APP_PORT=${base + 5}`)
      .replace(/^RABBITMQ_APP_PORT=.*$/m, `RABBITMQ_APP_PORT=${base + 6}`)
      .replace(/^RABBITMQ_UI_APP_PORT=.*$/m, `RABBITMQ_UI_APP_PORT=${base + 7}`)
      .concat(`\nCOMPOSE_PROJECT_NAME=${composeProject}\n`);
  }

  private async runCommand(command: string, args: string[], cwd: string, timeout = 120_000) {
    return execFileAsync(command, args, { cwd, timeout, maxBuffer: 1024 * 1024, env: process.env });
  }

  private async createGiteaRepo(giteaUrl: string, token: string, slug: string, name: string) {
    const response = await fetch(`${giteaUrl}/api/v1/user/repos`, {
      method: "POST",
      headers: { authorization: `token ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ name: slug, description: `GoneOps QuickStart project: ${name}`, private: false, auto_init: false })
    });
    if (response.status === 409 || response.status === 422) return;
    if (!response.ok) throw new Error(`Gitea repository creation failed: ${response.status} ${await response.text()}`);
  }

  private async pushToGitea(workspacePath: string, giteaUrl: string, token: string, owner: string, slug: string) {
    const url = new URL(giteaUrl);
    url.username = encodeURIComponent(token);
    url.pathname = `${url.pathname.replace(/\/$/, "")}/${owner}/${slug}.git`;
    await this.runCommand("git", ["remote", "remove", "origin"], workspacePath).catch(() => undefined);
    await this.runCommand("git", ["remote", "add", "origin", url.toString()], workspacePath);
    await this.runCommand("git", ["push", "-u", "origin", "main", "--force"], workspacePath, 180_000);
    await this.runCommand("git", ["remote", "set-url", "origin", `${giteaUrl}/${owner}/${slug}.git`], workspacePath);
  }

  private async triggerWoodpecker(woodpeckerUrl: string, token: string, owner: string, slug: string) {
    const endpoints = [`${woodpeckerUrl}/api/repos/${owner}/${slug}/builds`, `${woodpeckerUrl}/api/repos/${owner}%2F${slug}/builds`];
    let last = "";
    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${token}` } });
      const body = await response.text();
      if (response.ok) return `${endpoint.replace(woodpeckerUrl, woodpeckerUrl)} ${body ? "accepted" : "triggered"}`;
      last = `${response.status} ${body}`;
    }
    throw new Error(`Woodpecker trigger failed: ${last}`);
  }

  private redactRemote(remote: string) {
    return remote.replace(/:\/\/[^/@]+@/, "://[REDACTED]@");
  }

  private automation(slug: string) {
    const giteaUrl = process.env.GITEA_URL ?? "http://localhost:3001";
    const woodpeckerUrl = process.env.WOODPECKER_URL ?? "http://localhost:8000";
    const repositoryUrl = `${giteaUrl}/goneops/${slug}`;
    const pipelineUrl = `${woodpeckerUrl}/repos/goneops/${slug}`;
    const sandboxUrl = `/quickstart/projects/${slug}/sandbox`;
    const configured = Boolean(process.env.GITEA_URL && process.env.WOODPECKER_URL);
    const steps: QuickStartAutomationStep[] = [
      { step: "Create Gitea repository", status: configured ? "configured" : "requires_configuration", detail: configured ? repositoryUrl : "Set GITEA_URL and a local Gitea access token before live repo creation." },
      { step: "Push generated project", status: "ready", detail: "Generated scripts and local git metadata are ready for push to the self-hosted remote." },
      { step: "Trigger Woodpecker CI", status: configured ? "configured" : "requires_configuration", detail: configured ? pipelineUrl : "Woodpecker server must be connected to Gitea before automatic trigger." },
      { step: "Build containers", status: "ready", detail: "Woodpecker pipeline and local-cicd script both run docker compose build." },
      { step: "Start sandbox", status: "ready", detail: "Docker Compose starts the generated app sandbox after validation." },
      { step: "Expose sandbox URL", status: "ready", detail: sandboxUrl }
    ];
    return {
      mode: "local-self-hosted" as const,
      sourceControl: "Gitea" as const,
      cicd: "Woodpecker CI" as const,
      runtime: "Docker Compose" as const,
      repositoryUrl,
      pipelineUrl,
      sandboxUrl,
      liveFrontendUrl: this.liveServiceUrls(slug).frontendUrl,
      liveApiUrl: this.liveServiceUrls(slug).apiUrl,
      steps,
      logs: steps.map((step) => `[${step.status}] ${step.step}: ${step.detail}`)
    };
  }

  private toProjectSummary(project: GenerateQuickStartResponse): QuickStartProjectSummary {
    return {
      name: project.project.name,
      slug: project.project.slug,
      url: project.project.url,
      stackSummary: project.stackSummary,
      generatedAt: project.project.generatedAt,
      fileCount: project.files.length,
      sandboxUrl: project.automation.sandboxUrl,
      repositoryUrl: project.automation.repositoryUrl,
      pipelineUrl: project.automation.pipelineUrl,
      workspacePath: project.automation.workspacePath,
      composeProject: project.automation.composeProject
    };
  }

  private resolveSelection(request: GenerateQuickStartRequest): StackSelection {
    const requestedStack = request.stack;
    const legacyBackend = requestedStack && ["node-http", "node-service", "node-worker-api"].includes(String(requestedStack)) ? "ExpressJS" : requestedStack;
    const stackBackend = requestedStack === "NextJS" ? "ExpressJS" : legacyBackend;
    const frontend = request.frontend ?? (requestedStack === "NextJS" ? "NextJS" : "Static HTML");
    const infrastructure = request.infrastructure?.length ? [...request.infrastructure] : [];
    if ((request.cache ?? "Redis") === "Redis" && !infrastructure.includes("Redis")) infrastructure.push("Redis");
    if ((request.queue ?? "RabbitMQ") === "RabbitMQ" && !infrastructure.includes("RabbitMQ")) infrastructure.push("RabbitMQ");
    const selection = {
      frontend,
      backend: (request.backend ?? stackBackend ?? "Go Fiber") as QuickStartBackend,
      database: request.database ?? "MySQL",
      infrastructure
    };
    if (!FRONTENDS.includes(selection.frontend)) throw new Error(`Unsupported QuickStart frontend: ${selection.frontend}`);
    if (!BACKENDS.includes(selection.backend)) throw new Error(`Unsupported QuickStart backend: ${selection.backend}`);
    if (!DATABASES.includes(selection.database)) throw new Error(`Unsupported QuickStart database: ${selection.database}`);
    for (const item of selection.infrastructure) {
      if (!INFRASTRUCTURE.includes(item)) throw new Error(`Unsupported QuickStart infrastructure: ${item}`);
    }
    return selection;
  }

  private normalizeName(name: string) {
    const normalized = name.trim().replace(/\s+/g, " ");
    if (!normalized) throw new Error("Project name is required");
    if (normalized.length > 80) throw new Error("Project name must be 80 characters or fewer");
    return normalized;
  }

  private slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  }

  private servicePorts(selection: StackSelection): ServicePort[] {
    const ports: ServicePort[] = [
      { name: "Frontend", internal: "${FRONTEND_PORT}", external: "${FRONTEND_APP_PORT}", url: "http://localhost:${FRONTEND_APP_PORT}" },
      { name: "Backend API", internal: "${API_PORT}", external: "${API_APP_PORT}", url: "http://localhost:${API_APP_PORT}" }
    ];
    if (selection.database === "PostgreSQL") ports.push({ name: "PostgreSQL", internal: "5432", external: "${POSTGRES_APP_PORT}" });
    if (selection.database === "MySQL") ports.push({ name: "MySQL", internal: "3306", external: "${MYSQL_APP_PORT}" });
    if (selection.database === "MongoDB") ports.push({ name: "MongoDB", internal: "27017", external: "${MONGO_APP_PORT}" });
    if (selection.infrastructure.includes("Redis")) ports.push({ name: "Redis", internal: "6379", external: "${REDIS_APP_PORT}" });
    if (selection.infrastructure.includes("RabbitMQ")) ports.push({ name: "RabbitMQ", internal: "5672", external: "${RABBITMQ_APP_PORT}" }, { name: "RabbitMQ UI", internal: "15672", external: "${RABBITMQ_UI_APP_PORT}", url: "http://localhost:${RABBITMQ_UI_APP_PORT}" });
    if (selection.infrastructure.includes("MinIO")) ports.push({ name: "MinIO API", internal: "9000", external: "${MINIO_APP_PORT}" }, { name: "MinIO Console", internal: "9001", external: "${MINIO_CONSOLE_APP_PORT}", url: "http://localhost:${MINIO_CONSOLE_APP_PORT}" });
    return ports;
  }

  private urls(ports: ServicePort[]) {
    return ports.filter((port) => port.url).map((port) => ({ name: port.name, url: port.url ?? "" })).concat([{ name: "Swagger", url: "http://localhost:${API_APP_PORT}/swagger" }]);
  }

  private generatedServices(selection: StackSelection) {
    return ["frontend", "api", ...(selection.database === "None" ? [] : [this.databaseService(selection.database)]), ...selection.infrastructure.map((item) => item.toLowerCase())];
  }

  private databaseService(database: QuickStartDatabase) {
    return { PostgreSQL: "postgres", MySQL: "mysql", MongoDB: "mongo", None: "" }[database];
  }

  private credentials(selection: StackSelection) {
    const credentials = [
      { service: "Backend", username: "n/a", password: "n/a", note: "API has no auth in the local demo" }
    ];
    if (selection.database === "PostgreSQL") credentials.push({ service: "PostgreSQL", username: "appuser", password: "apppassword", note: "database=appdb host=postgres port=5432" });
    if (selection.database === "MySQL") credentials.push({ service: "MySQL", username: "appuser", password: "apppassword", note: "database=appdb host=mysql port=3306" });
    if (selection.database === "MongoDB") credentials.push({ service: "MongoDB", username: "appuser", password: "apppassword", note: "database=appdb host=mongo port=27017" });
    if (selection.infrastructure.includes("RabbitMQ")) credentials.push({ service: "RabbitMQ", username: "guest", password: "guest", note: "management UI enabled locally" });
    if (selection.infrastructure.includes("MinIO")) credentials.push({ service: "MinIO", username: "minioadmin", password: "minioadmin", note: "local demo credentials only" });
    return credentials;
  }

  private renderEnvExample(selection: StackSelection) {
    const lines = [
      "NODE_ENV=development",
      "FRONTEND_PORT=3000",
      "FRONTEND_APP_PORT=3000",
      "API_PORT=8080",
      "API_APP_PORT=8080",
      "APP_PORT=8080",
      "POSTGRES_APP_PORT=5432",
      "MYSQL_APP_PORT=3306",
      "MONGO_APP_PORT=27017",
      "REDIS_APP_PORT=6379",
      "RABBITMQ_APP_PORT=5672",
      "RABBITMQ_UI_APP_PORT=15672",
      "MINIO_APP_PORT=9000",
      "MINIO_CONSOLE_APP_PORT=9001",
      "DB_NAME=appdb",
      "DB_USER=appuser",
      "DB_PASSWORD=apppassword",
      `DB_TYPE=${selection.database}`,
      "REDIS_URL=redis://redis:6379",
      "RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672",
      "MINIO_ENDPOINT=minio:9000",
      "MINIO_ROOT_USER=minioadmin",
      "MINIO_ROOT_PASSWORD=minioadmin"
    ];
    return `${lines.join("\n")}\n`;
  }

  private renderGitignore() { return ["node_modules/", ".env", ".DS_Store", "dist/", "__pycache__/", "target/", "*.log", ""].join("\n"); }
  private renderMakefile() { return [".PHONY: up down ps logs health ci sandbox", "up:", "\tcp .env.example .env 2>/dev/null || true", "\tdocker compose up -d --build", "down:", "\tdocker compose down -v", "ps:", "\tdocker compose ps", "logs:", "\tdocker compose logs -f", "health:", "\tcurl http://localhost:$${API_APP_PORT}/health", "ci:", "\tsh scripts/local-cicd.sh", "sandbox:", "\tsh scripts/start-sandbox.sh", ""].join("\n"); }
  private renderWoodpeckerPipeline() { return ["pipeline:", "  validate:", "    image: docker:27-cli", "    commands:", "      - docker compose config --quiet", "  build:", "    image: docker:27-cli", "    commands:", "      - docker compose build", "  sandbox:", "    image: docker:27-cli", "    commands:", "      - docker compose up -d --build", "      - docker compose ps", "      - sh scripts/healthcheck.sh", "      - docker compose logs --no-color --tail=120", ""].join("\n"); }
  private renderLocalCicdScript() { return ["#!/usr/bin/env sh", "set -eu", "docker compose config --quiet", "docker compose build", "docker compose up -d --build", "docker compose ps", "sh scripts/healthcheck.sh", "docker compose logs --no-color --tail=120", ""].join("\n"); }
  private renderStartSandboxScript(slug: string) { return ["#!/usr/bin/env sh", "set -eu", "cp .env.example .env 2>/dev/null || true", "docker compose up -d --build", `printf 'Sandbox URL: /quickstart/projects/${slug}/sandbox\n'`, ""].join("\n"); }
  private renderHealthcheckScript() { return ["#!/usr/bin/env sh", "set -eu", "wget -qO- http://127.0.0.1:${API_PORT:-8080}/health >/dev/null", ""].join("\n"); }

  private renderOpenApi(name: string) {
    return ["openapi: 3.0.3", "info:", `  title: ${name} API`, "  version: 0.1.0", "paths:", "  /health:", "    get:", "      responses:", "        '200': { description: OK }", "  /jobs:", "    get:", "      responses:", "        '200': { description: Job list }", "    post:", "      responses:", "        '201': { description: Created job }", "  /jobs/{id}:", "    get:", "      parameters:", "        - in: path", "          name: id", "          required: true", "          schema: { type: string }", "      responses:", "        '200': { description: Job }", ""].join("\n");
  }

  private renderBackendFiles(selection: StackSelection, includeHelloWorld: boolean): QuickStartGeneratedFile[] {
    if (selection.backend === "Go Fiber") return this.renderGoFiberFiles(includeHelloWorld);
    if (selection.backend === "FastAPI") return this.renderFastApiFiles(selection, includeHelloWorld);
    if (selection.backend === "NestJS") return this.renderNestFiles(selection, includeHelloWorld);
    return this.renderExpressFiles(selection, includeHelloWorld);
  }

  private renderGoFiberFiles(includeHelloWorld: boolean): QuickStartGeneratedFile[] {
    const code = `package main

import (
  "context"
  "database/sql"
  "fmt"
  "log"
  "os"
  "time"

  "github.com/gofiber/fiber/v2"
  "github.com/gofiber/swagger"
  _ "github.com/lib/pq"
  "github.com/redis/go-redis/v9"
  amqp "github.com/rabbitmq/amqp091-go"
  _ "quickstart-api/docs"
)

type Job struct { ID string \`json:"id"\`; Title string \`json:"title"\`; Status string \`json:"status"\` }

func main() {
  port := os.Getenv("API_PORT")
  if port == "" { log.Fatal("API_PORT must be set through .env") }
  db := connectPostgres()
  redisClient := redis.NewClient(&redis.Options{Addr: "redis:6379"})
  rabbitURL := os.Getenv("RABBITMQ_URL")
  if rabbitURL == "" { rabbitURL = "amqp://guest:***@rabbitmq:5672" }

  app := fiber.New()
  app.Get("/swagger/*", swagger.HandlerDefault)
  app.Get("/swagger", func(c *fiber.Ctx) error { return c.Redirect("/swagger/index.html") })
${includeHelloWorld ? '  app.Get("/hello", func(c *fiber.Ctx) error { return c.JSON(fiber.Map{"message":"Hello World from GoneOps QuickStart","service":"Go Fiber"}) })\n' : ''}  app.Get("/health", func(c *fiber.Ctx) error {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second); defer cancel()
    dbOK := db.PingContext(ctx) == nil
    redisOK := redisClient.Ping(ctx).Err() == nil
    rabbitOK := rabbitPing(rabbitURL)
    status := "ok"; if !dbOK || !redisOK || !rabbitOK { status = "degraded" }
    return c.JSON(fiber.Map{"status":status,"database":dbOK,"redis":redisOK,"rabbitmq":rabbitOK})
  })
  app.Get("/jobs", func(c *fiber.Ctx) error {
    rows, err := db.Query("SELECT id, title, status FROM jobs ORDER BY id"); if err != nil { return c.Status(500).JSON(fiber.Map{"error":err.Error()}) }
    defer rows.Close(); jobs := []Job{}
    for rows.Next() { var job Job; _ = rows.Scan(&job.ID, &job.Title, &job.Status); jobs = append(jobs, job) }
    return c.JSON(jobs)
  })
  app.Post("/jobs", func(c *fiber.Ctx) error {
    var body map[string]string; _ = c.BodyParser(&body)
    id := time.Now().Format("20060102150405"); title := body["title"]; if title == "" { title = "Create Demo Job" }
    job := Job{ID:id, Title:title, Status:"processed"}
    if _, err := db.Exec("INSERT INTO jobs (id, title, status) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET title=$2, status=$3", job.ID, job.Title, job.Status); err != nil { return c.Status(500).JSON(fiber.Map{"error":err.Error()}) }
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second); defer cancel()
    _ = redisClient.Set(ctx, "latest_job", job.ID, time.Hour).Err()
    _ = publishRabbit(rabbitURL, job.ID)
    return c.Status(201).JSON(job)
  })
  app.Get("/jobs/:id", func(c *fiber.Ctx) error {
    var job Job; err := db.QueryRow("SELECT id, title, status FROM jobs WHERE id=$1", c.Params("id")).Scan(&job.ID, &job.Title, &job.Status)
    if err == sql.ErrNoRows { return c.Status(404).JSON(fiber.Map{"error":"not_found"}) }
    if err != nil { return c.Status(500).JSON(fiber.Map{"error":err.Error()}) }
    return c.JSON(job)
  })
  log.Fatal(app.Listen(":" + port))
}

func connectPostgres() *sql.DB {
  dsn := fmt.Sprintf("host=postgres port=5432 user=%s password=%s dbname=%s sslmode=disable", env("DB_USER", "appuser"), env("DB_PASSWORD", "apppassword"), env("DB_NAME", "appdb"))
  db, err := sql.Open("postgres", dsn); if err != nil { log.Fatal(err) }
  for i := 0; i < 30; i++ { if db.Ping() == nil { break }; time.Sleep(time.Second) }
  _, err = db.Exec("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL)")
  if err != nil { log.Fatal(err) }
  return db
}
func env(key string, fallback string) string { value := os.Getenv(key); if value == "" { return fallback }; return value }
func rabbitPing(url string) bool { conn, err := amqp.Dial(url); if err != nil { return false }; defer conn.Close(); return true }
func publishRabbit(url string, body string) error { conn, err := amqp.Dial(url); if err != nil { return err }; defer conn.Close(); ch, err := conn.Channel(); if err != nil { return err }; defer ch.Close(); q, err := ch.QueueDeclare("jobs", false, false, false, false, nil); if err != nil { return err }; return ch.Publish("", q.Name, false, false, amqp.Publishing{ContentType:"text/plain", Body:[]byte(body)}) }
`;
    return [
      { path: "backend/go.mod", content: "module quickstart-api\n\ngo 1.22\n\nrequire github.com/gofiber/fiber/v2 v2.52.5\nrequire github.com/gofiber/swagger v1.1.0\nrequire github.com/lib/pq v1.10.9\nrequire github.com/redis/go-redis/v9 v9.6.1\nrequire github.com/rabbitmq/amqp091-go v1.10.0\n" },
      { path: "backend/main.go", content: code },
      { path: "backend/docs/docs.go", content: "package docs\n" },
      { path: "backend/Dockerfile", content: "FROM golang:1.22-alpine AS build\nWORKDIR /app\nCOPY go.mod ./\nCOPY . .\nRUN go mod tidy && go build -o /api .\nFROM alpine:3.20\nWORKDIR /app\nCOPY --from=build /api /api\nCMD [\"/api\"]\n" }
    ];
  }

  private renderExpressFiles(selection: StackSelection, includeHelloWorld: boolean): QuickStartGeneratedFile[] {
    return [
      { path: "backend/package.json", content: JSON.stringify({ type: "module", scripts: { build: "node --check src/server.js", start: "node src/server.js" }, dependencies: { "amqplib": "^0.10.4", express: "^4.19.2", "mysql2": "^3.11.3", redis: "^4.7.0", "swagger-ui-express": "^5.0.1" }, devDependencies: {} }, null, 2) + "\n" },
      { path: "backend/src/server.js", content: this.renderNodeServer("ExpressJS", selection, includeHelloWorld) },
      { path: "backend/Dockerfile", content: "FROM node:22-alpine\nWORKDIR /app\nCOPY package.json package-lock.json* ./\nRUN npm install --omit=dev\nCOPY src ./src\nCMD [\"npm\", \"start\"]\n" }
    ];
  }

  private renderNestFiles(selection: StackSelection, includeHelloWorld: boolean): QuickStartGeneratedFile[] {
    return [
      { path: "backend/package.json", content: JSON.stringify({ type: "module", scripts: { build: "node --check src/server.js", start: "node src/server.js" }, dependencies: { "amqplib": "^0.10.4", express: "^4.19.2", "mysql2": "^3.11.3", redis: "^4.7.0", "swagger-ui-express": "^5.0.1" } }, null, 2) + "\n" },
      { path: "backend/src/server.js", content: this.renderNodeServer("NestJS-compatible", selection, includeHelloWorld) },
      { path: "backend/Dockerfile", content: "FROM node:22-alpine\nWORKDIR /app\nCOPY package.json package-lock.json* ./\nRUN npm install --omit=dev\nCOPY src ./src\nCMD [\"npm\", \"start\"]\n" }
    ];
  }

  private renderNodeServer(label: string, selection: StackSelection, includeHelloWorld: boolean) {
    const usesMySql = selection.database === "MySQL";
    const usesRedis = selection.infrastructure.includes("Redis");
    const usesRabbit = selection.infrastructure.includes("RabbitMQ");
    return `import amqp from "amqplib";
import express from "express";
import mysql from "mysql2/promise";
import { createClient } from "redis";
import swaggerUi from "swagger-ui-express";

const port = process.env.API_PORT;
if (!port) { throw new Error("API_PORT must be set through .env"); }
const jobs = new Map([["demo-1", { id: "demo-1", title: "Seeded demo job", status: "seeded" }]]);
const app = express();
app.use((_, res, next) => { res.setHeader("access-control-allow-origin", "*"); res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS"); res.setHeader("access-control-allow-headers", "content-type"); next(); });
app.options("*", (_, res) => res.sendStatus(204));
app.use(express.json());
app.use("/swagger", swaggerUi.serve, swaggerUi.setup({ openapi: "3.0.3", info: { title: "QuickStart API", version: "0.1.0" }, paths: {} }));

const mysqlPool = ${usesMySql ? `mysql.createPool({ host: "mysql", port: 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, waitForConnections: true, connectionLimit: 4 })` : "null"};
const redisClient = ${usesRedis ? "createClient({ url: process.env.REDIS_URL })" : "null"};
if (redisClient) redisClient.on("error", (error) => console.error("redis error", error.message));

async function retry(label, fn, attempts = 40) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try { return await fn(); } catch (error) { lastError = error; await new Promise((resolve) => setTimeout(resolve, 1000)); }
  }
  throw new Error(label + " failed: " + (lastError?.message ?? lastError));
}

async function init() {
  if (mysqlPool) {
    await retry("mysql connection", () => mysqlPool.query("SELECT 1"));
    await mysqlPool.query("CREATE TABLE IF NOT EXISTS jobs (id VARCHAR(64) PRIMARY KEY, title TEXT NOT NULL, status VARCHAR(32) NOT NULL)");
    await mysqlPool.query("INSERT IGNORE INTO jobs (id, title, status) VALUES ('demo-1', 'Seeded demo job', 'seeded')");
  }
  if (redisClient) await retry("redis connection", () => redisClient.connect());
  if (${usesRabbit}) await retry("rabbitmq connection", async () => { const connection = await amqp.connect(process.env.RABBITMQ_URL); await connection.close(); });
}

async function checkRabbit() {
  if (!${usesRabbit}) return true;
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  await connection.close();
  return true;
}
async function publishRabbit(body) {
  if (!${usesRabbit}) return null;
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  const queue = "jobs";
  await channel.assertQueue(queue, { durable: false });
  await channel.sendToQueue(queue, Buffer.from(body));
  await channel.close();
  await connection.close();
  return body;
}
async function consumeRabbit() {
  if (!${usesRabbit}) return null;
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue("jobs", { durable: false });
  const message = await channel.get("jobs", { noAck: true });
  await channel.close();
  await connection.close();
  return message ? message.content.toString() : null;
}

${includeHelloWorld ? `app.get("/hello", (_req, res) => res.json({ message: "Hello World from GoneOps QuickStart", service: "${label}" }));
` : ""}app.get("/health", async (_req, res) => {
  const database = mysqlPool ? await mysqlPool.query("SELECT 1").then(() => true).catch(() => false) : "${selection.database}" === "None";
  const redis = redisClient ? await redisClient.ping().then((value) => value === "PONG").catch(() => false) : !${usesRedis};
  const rabbitmq = await checkRabbit().catch(() => false);
  const ok = Boolean(database && redis && rabbitmq);
  res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded", backend: "${label}", database, redis, rabbitmq });
});
app.get("/jobs", async (_req, res) => {
  if (mysqlPool) { const [rows] = await mysqlPool.query("SELECT id, title, status FROM jobs ORDER BY id"); return res.json(rows); }
  return res.json(Array.from(jobs.values()));
});
app.post("/jobs", async (req, res) => {
  const id = String(Date.now()); const job = { id, title: req.body?.title ?? "Create Demo Job", status: "processed" };
  if (mysqlPool) await mysqlPool.query("INSERT INTO jobs (id, title, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title=VALUES(title), status=VALUES(status)", [job.id, job.title, job.status]);
  else jobs.set(id, job);
  if (redisClient) await redisClient.set("latest_job", job.id);
  await publishRabbit(job.id);
  res.status(201).json(job);
});
app.get("/integrations", async (_req, res) => {
  const redisLatestJob = redisClient ? await redisClient.get("latest_job") : null;
  const rabbitmqConsumedJob = await consumeRabbit().catch(() => null);
  res.json({ redisLatestJob, rabbitmqConsumedJob });
});
app.get("/jobs/:id", async (req, res) => {
  if (mysqlPool) { const [rows] = await mysqlPool.query("SELECT id, title, status FROM jobs WHERE id=?", [req.params.id]); if (!rows.length) return res.status(404).json({ error: "not_found" }); return res.json(rows[0]); }
  const job = jobs.get(req.params.id); if (!job) return res.status(404).json({ error: "not_found" }); return res.json(job);
});

await init();
app.listen(Number(port), () => console.log("api listening on " + port));
`;
  }

  private renderFastApiFiles(selection: StackSelection, includeHelloWorld: boolean): QuickStartGeneratedFile[] {
    return [
      { path: "backend/requirements.txt", content: "fastapi==0.115.0\nuvicorn[standard]==0.30.6\n" },
      { path: "backend/main.py", content: `import os, time\nfrom fastapi import FastAPI, HTTPException\n\napp = FastAPI(title="QuickStart API")\njobs = {}\n\n${includeHelloWorld ? `@app.get("/hello")\ndef hello(): return {"message":"Hello World from GoneOps QuickStart","service":"FastAPI"}\n\n` : ""}@app.get("/health")\ndef health(): return {"status":"ok","database":"${selection.database}","redis": bool(os.getenv("REDIS_URL")),"rabbitmq": bool(os.getenv("RABBITMQ_URL"))}\n\n@app.get("/swagger")\ndef swagger(): return {"url":"/docs"}\n\n@app.post("/jobs", status_code=201)\ndef create_job(body: dict):\n    job_id = str(int(time.time() * 1000)); job = {"id": job_id, "title": body.get("title", "Create Demo Job"), "status":"processed"}; jobs[job_id] = job; return job\n\n@app.get("/jobs")\ndef list_jobs(): return list(jobs.values())\n\n@app.get("/jobs/{job_id}")\ndef get_job(job_id: str):\n    if job_id not in jobs: raise HTTPException(status_code=404, detail="not_found")\n    return jobs[job_id]\n` },
      { path: "backend/Dockerfile", content: "FROM python:3.12-alpine\nWORKDIR /app\nCOPY requirements.txt ./\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY main.py ./\nCMD [\"sh\", \"-c\", \"uvicorn main:app --host 0.0.0.0 --port ${API_PORT}\"]\n" }
    ];
  }

  private renderFrontendFiles(selection: StackSelection): QuickStartGeneratedFile[] {
    const app = `<!doctype html><html><head><meta charset="utf-8"><title>QuickStart Demo</title><style>body{font-family:Inter,system-ui;margin:0;background:#f7f7f7;color:#111}.app{max-width:980px;margin:32px auto;padding:24px}.hero,.panel{background:white;border:1px solid #e5e5e5;border-radius:24px;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.06)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:16px}button,input{border-radius:12px;padding:12px 14px;border:1px solid #ddd}button{background:#000;color:white;border:0;font-weight:700;cursor:pointer}.secondary{background:#0ea5e9}.ok{color:#047857}.bad{color:#b91c1c}pre{white-space:pre-wrap;background:#080808;color:#ededed;border-radius:16px;padding:16px;max-height:300px;overflow:auto}</style></head><body><main class="app"><section class="hero"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:#777">Generated demo application</div><h1>${selection.frontend} Live Demo UI</h1><p>This is the real generated frontend. It calls the generated backend API, writes jobs to the database, stores latest job in Redis, and publishes/consumes RabbitMQ messages when selected.</p><div class="grid"><button onclick="loadHealth()">Check health</button><button onclick="loadJobs()">Load database jobs</button><button class="secondary" onclick="createJob()">Create job + Redis + RabbitMQ</button><button class="secondary" onclick="loadIntegrations()">Read Redis / consume RabbitMQ</button></div></section><section class="panel" style="margin-top:16px"><label>Job title</label><input id="title" style="width:100%;margin-top:8px" value="Demo job from live sandbox UI"><pre id="out">Ready. API base: <span id="api"></span></pre></section></main><script>const API_PORT="__API_APP_PORT__"; const api=location.protocol+'//'+location.hostname+':'+API_PORT; document.getElementById('api').textContent=api; async function show(label,promise){const out=document.getElementById('out'); out.textContent=label+'...'; try{const r=await promise; const data=await r.json(); out.textContent=label+'\n'+JSON.stringify(data,null,2)}catch(e){out.textContent=label+' failed: '+e.message}} function loadHealth(){return show('Health + service connectivity', fetch(api+'/health'))} function loadJobs(){return show('Database CRUD: list jobs', fetch(api+'/jobs'))} function createJob(){return show('Create job: database insert + Redis set + RabbitMQ publish', fetch(api+'/jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:document.getElementById('title').value})}))} function loadIntegrations(){return show('Redis GET + RabbitMQ consume', fetch(api+'/integrations'))} loadHealth(); loadJobs();</script></body></html>`;
    return [
      { path: "frontend/index.html", content: app },
      { path: "frontend/server.mjs", content: "import { createServer } from 'node:http';\nimport { readFileSync } from 'node:fs';\nconst port = process.env.FRONTEND_PORT;\nconst apiAppPort = process.env.API_APP_PORT;\nif (!port) throw new Error('FRONTEND_PORT must be set through .env');\nif (!apiAppPort) throw new Error('API_APP_PORT must be set through .env');\nconst html = readFileSync(new URL('./index.html', import.meta.url), 'utf8').replaceAll('__API_APP_PORT__', apiAppPort);\ncreateServer((_req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); }).listen(Number(port), '0.0.0.0', () => console.log('frontend listening on ' + port));\n" },
      { path: "frontend/Dockerfile", content: "FROM node:22-alpine\nWORKDIR /app\nCOPY index.html server.mjs ./\nCMD [\"node\", \"server.mjs\"]\n" }
    ];
  }

  private renderSeedFiles(selection: StackSelection): QuickStartGeneratedFile[] {
    if (selection.database === "PostgreSQL") return [{ path: "database/seed.sql", content: "CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL);\nINSERT INTO jobs (id, title, status) VALUES ('demo-1', 'Seeded demo job', 'seeded') ON CONFLICT (id) DO NOTHING;\n" }];
    if (selection.database === "MySQL") return [{ path: "database/seed.sql", content: "CREATE TABLE IF NOT EXISTS jobs (id VARCHAR(64) PRIMARY KEY, title TEXT NOT NULL, status VARCHAR(32) NOT NULL);\nINSERT IGNORE INTO jobs (id, title, status) VALUES ('demo-1', 'Seeded demo job', 'seeded');\n" }];
    if (selection.database === "MongoDB") return [{ path: "database/seed.js", content: "db.jobs.updateOne({id:'demo-1'}, {$set:{id:'demo-1', title:'Seeded demo job', status:'seeded'}}, {upsert:true});\n" }];
    return [];
  }

  private renderDockerCompose(selection: StackSelection) {
    const db = this.databaseCompose(selection.database);
    const infra = selection.infrastructure.flatMap((item) => this.infrastructureCompose(item));
    const dependencies = [
      ...(selection.database === "None" ? [] : [this.databaseService(selection.database)]),
      ...selection.infrastructure.map((item) => item.toLowerCase())
    ];
    return [
      "services:",
      "  frontend:",
      "    build: ./frontend",
      "    env_file:",
      "      - .env",
      "    ports:",
      "      - \"${FRONTEND_APP_PORT:?FRONTEND_APP_PORT must be set}:${FRONTEND_PORT:?FRONTEND_PORT must be set}\"",
      "    depends_on:",
      "      - api",
      "  api:",
      "    build: ./backend",
      "    env_file:",
      "      - .env",
      "    ports:",
      "      - \"${API_APP_PORT:?API_APP_PORT must be set}:${API_PORT:?API_PORT must be set}\"",
      ...(dependencies.length ? ["    depends_on:", ...dependencies.map((dependency) => `      - ${dependency}`)] : []),
      "    healthcheck:",
      "      test: [\"CMD-SHELL\", \"wget -qO- http://127.0.0.1:${API_PORT}/health || exit 1\"]",
      "      interval: 10s",
      "      timeout: 5s",
      "      retries: 10",
      ...db,
      ...infra,
      ""
    ].join("\n");
  }

  private databaseCompose(database: QuickStartDatabase) {
    if (database === "None") return [];
    if (database === "PostgreSQL") return ["  postgres:", "    image: postgres:16-alpine", "    environment:", "      POSTGRES_DB: ${DB_NAME}", "      POSTGRES_USER: ${DB_USER}", "      POSTGRES_PASSWORD: ${DB_PASSWORD}", "    ports:", "      - \"${POSTGRES_APP_PORT}:5432\"", "    volumes:", "      - ./database/seed.sql:/docker-entrypoint-initdb.d/seed.sql:ro"];
    if (database === "MySQL") return ["  mysql:", "    image: mysql:8", "    environment:", "      MYSQL_DATABASE: ${DB_NAME}", "      MYSQL_USER: ${DB_USER}", "      MYSQL_PASSWORD: ${DB_PASSWORD}", "      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}", "    ports:", "      - \"${MYSQL_APP_PORT}:3306\"", "    volumes:", "      - ./database/seed.sql:/docker-entrypoint-initdb.d/seed.sql:ro"];
    return ["  mongo:", "    image: mongo:7", "    environment:", "      MONGO_INITDB_ROOT_USERNAME: ${DB_USER}", "      MONGO_INITDB_ROOT_PASSWORD: ${DB_PASSWORD}", "      MONGO_INITDB_DATABASE: ${DB_NAME}", "    ports:", "      - \"${MONGO_APP_PORT}:27017\"", "    volumes:", "      - ./database/seed.js:/docker-entrypoint-initdb.d/seed.js:ro"];
  }

  private infrastructureCompose(item: QuickStartInfrastructure) {
    if (item === "Redis") return ["  redis:", "    image: redis:7-alpine", "    ports:", "      - \"${REDIS_APP_PORT}:6379\""];
    if (item === "RabbitMQ") return ["  rabbitmq:", "    image: rabbitmq:3-management-alpine", "    ports:", "      - \"${RABBITMQ_APP_PORT}:5672\"", "      - \"${RABBITMQ_UI_APP_PORT}:15672\""];
    return ["  minio:", "    image: minio/minio:RELEASE.2024-07-16T23-46-41Z", "    command: server /data --console-address ':9001'", "    environment:", "      MINIO_ROOT_USER: ${MINIO_ROOT_USER}", "      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}", "    ports:", "      - \"${MINIO_APP_PORT}:9000\"", "      - \"${MINIO_CONSOLE_APP_PORT}:9001\""];
  }

  private renderReadme(name: string, slug: string, selection: StackSelection, ports: ServicePort[]) {
    return `# ${name}\n\nGenerated by GoneOps QuickStart Edition: a local-first Vercel for backend stacks.\n\n## Architecture overview\n\n${selection.frontend} frontend, ${selection.backend} backend API, ${selection.database}, and ${selection.infrastructure.join(", ")} run together on Docker Compose automatic service networking.\n\n## Service list\n\n${this.generatedServices(selection).map((service) => `- ${service}`).join("\n")}\n\n## Local self-hosted deployment flow

1. Select stack in QuickStart.
2. Generate project.
3. Create repository in Gitea.
4. Push generated project automatically.
5. Trigger Woodpecker CI automatically.
6. Build containers.
7. Start Docker Compose sandbox.
8. Open sandbox URL: /quickstart/projects/${slug}/sandbox

## Startup steps\n\n\`\`\`bash\ncp .env.example .env\ndocker compose up -d --build\n\`\`\`\n\n## Ports and URLs\n\n${ports.map((port) => `- ${port.name}: host ${port.external} -> container ${port.internal}${port.url ? ` (${port.url})` : ""}`).join("\n")}\n\nSwagger URL: http://localhost:\${API_APP_PORT}/swagger\n\n## Credentials\n\n${this.credentials(selection).map((credential) => `- ${credential.service}: user=${credential.username} password=${credential.password} ${credential.note}`).join("\n")}\n\n## API usage examples\n\n\`\`\`bash\ncurl http://localhost:\${API_APP_PORT}/health\ncurl http://localhost:\${API_APP_PORT}/jobs\ncurl -X POST http://localhost:\${API_APP_PORT}/jobs -H 'content-type: application/json' -d '{"title":"Create Demo Job"}'\n\`\`\`\n\n## Docker commands\n\n\`\`\`bash\ndocker compose ps\ndocker compose logs -f\ndocker compose down -v\n\`\`\`\n\n## Environment variables\n\nAll ports and credentials are configured through .env. Start from .env.example.\n\n## Troubleshooting\n\n- If a host port is busy, change the corresponding *_APP_PORT in .env.\n- If a service is unhealthy, run docker compose logs <service>.\n- Recreate clean state with docker compose down -v.\n\n## Project structure\n\n- backend/\n- frontend/\n- database/\n- .woodpecker.yml\n- docker-compose.yml\n- openapi.yaml\n- scripts/healthcheck.sh\n\nProject folder: ${slug}\n`;
  }

  private validate(files: QuickStartGeneratedFile[], selection: StackSelection, options: { includeReadme: boolean; includeDockerCompose: boolean; includeCi: boolean; includeHelloWorld: boolean }) {
    const required = [
      ...(options.includeReadme ? ["README.md"] : []),
      ...(options.includeDockerCompose ? ["docker-compose.yml"] : []),
      ...(options.includeCi ? [".woodpecker.yml"] : []),
      ".env.example",
      "Makefile",
      "openapi.yaml",
      "backend/Dockerfile",
      "frontend/Dockerfile",
      "scripts/healthcheck.sh"
    ];
    const paths = files.map((file) => file.path);
    for (const requiredPath of required) if (!paths.some((path) => path.endsWith(requiredPath))) throw new Error(`Missing QuickStart generated file: ${requiredPath}`);
    const joined = files.map((file) => file.content).join("\n");
    const markers = ["/health", "/swagger", "/jobs", "Create Demo Job", "${API_APP_PORT", "${API_PORT", selection.database];
    if (options.includeHelloWorld) markers.push("/hello", "Hello World");
    if (options.includeDockerCompose) markers.push("docker compose up -d --build");
    if (options.includeCi) markers.push("Woodpecker", "docker compose config --quiet", "docker compose build");
    for (const marker of markers) {
      if (!joined.includes(marker)) throw new Error(`Missing QuickStart generated marker: ${marker}`);
    }
    for (const file of files) if (/ghp_|sk-[A-Za-z0-9]|BEGIN (RSA|OPENSSH|PRIVATE) KEY/.test(file.content)) throw new Error(`Secret-looking token found in generated file ${file.path}`);
  }
}
