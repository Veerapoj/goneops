export type QuickStartStack = "node-http" | "node-service" | "node-worker-api";

export type GenerateQuickStartRequest = {
  name?: string;
  stack?: QuickStartStack;
};

export type QuickStartGeneratedFile = {
  path: string;
  content: string;
};

export type GenerateQuickStartResponse = {
  edition: "GoneOps QuickStart Edition";
  goal: "One Click Project Bootstrap";
  project: {
    name: string;
    slug: string;
    stack: QuickStartStack;
  };
  flow: ["select stack", "click generate", "run local project"];
  files: QuickStartGeneratedFile[];
  validation: {
    valid: true;
    checks: string[];
  };
};
