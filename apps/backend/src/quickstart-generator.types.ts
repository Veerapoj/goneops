export type QuickStartFrontend = "NextJS" | "React" | "Vue" | "Static HTML";
export type QuickStartBackend = "Go Fiber" | "NestJS" | "ExpressJS" | "FastAPI";
export type QuickStartDatabase = "PostgreSQL" | "MySQL" | "MongoDB" | "None";
export type QuickStartInfrastructure = "Redis" | "RabbitMQ" | "MinIO";
export type QuickStartStackChoice = "NestJS" | "NextJS" | "Go Fiber" | "FastAPI";
export type QuickStartStack = QuickStartBackend | QuickStartStackChoice | "node-http" | "node-service" | "node-worker-api";
export type QuickStartCache = "Redis" | "None";
export type QuickStartQueue = "RabbitMQ" | "None";

export type GenerateQuickStartRequest = {
  name?: string;
  stack?: QuickStartStack;
  frontend?: QuickStartFrontend;
  backend?: QuickStartBackend;
  database?: QuickStartDatabase;
  cache?: QuickStartCache;
  queue?: QuickStartQueue;
  infrastructure?: QuickStartInfrastructure[];
  includeReadme?: boolean;
  includeDockerCompose?: boolean;
  includeCi?: boolean;
  includeHelloWorld?: boolean;
};

export type QuickStartGeneratedFile = { path: string; content: string };
export type QuickStartProjectSummary = { name: string; slug: string; url: string; stackSummary: string; generatedAt: string; fileCount: number };
export type DeleteQuickStartProjectRequest = { confirmationName?: string };
export type GenerateQuickStartResponse = {
  edition: "GoneOps QuickStart Edition";
  goal: "One Click Project Bootstrap";
  project: { name: string; slug: string; stack: QuickStartStack; url: string; generatedAt: string; selection: { frontend: QuickStartFrontend; backend: QuickStartBackend; database: QuickStartDatabase; infrastructure: QuickStartInfrastructure[] } };
  stackSummary: string;
  generatedServices: string[];
  ports: { name: string; internal: string; external: string; url?: string }[];
  urls: { name: string; url: string }[];
  credentials: { service: string; username: string; password: string; note: string }[];
  swaggerUrl: string;
  apiExamples: string[];
  dockerCommands: string[];
  generationLogs: string[];
  containerStatus: { service: string; status: string; health: string }[];
  flow: ["select stack", "click generate", "run local project"];
  files: QuickStartGeneratedFile[];
  readme: string;
  validation: { valid: true; checks: string[] };
};
