export type QuickStartFrontend = "NextJS" | "React" | "Vue" | "Static HTML";
export type QuickStartBackend = "Go Fiber" | "NestJS" | "ExpressJS" | "FastAPI";
export type QuickStartDatabase = "PostgreSQL" | "MySQL" | "MongoDB";
export type QuickStartInfrastructure = "Redis" | "RabbitMQ" | "MinIO";
export type QuickStartStack = QuickStartBackend | "node-http" | "node-service" | "node-worker-api";

export type GenerateQuickStartRequest = {
  name?: string;
  stack?: QuickStartStack;
  frontend?: QuickStartFrontend;
  backend?: QuickStartBackend;
  database?: QuickStartDatabase;
  infrastructure?: QuickStartInfrastructure[];
};

export type QuickStartGeneratedFile = { path: string; content: string };
export type GenerateQuickStartResponse = {
  edition: "GoneOps QuickStart Edition";
  goal: "One Click Project Bootstrap";
  project: { name: string; slug: string; stack: QuickStartStack; selection: { frontend: QuickStartFrontend; backend: QuickStartBackend; database: QuickStartDatabase; infrastructure: QuickStartInfrastructure[] } };
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
  validation: { valid: true; checks: string[] };
};
