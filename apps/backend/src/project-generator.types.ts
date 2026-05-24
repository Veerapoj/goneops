export type ProjectStack = "next-nest" | "api-worker" | "static-site";
export type ProjectTemplate = "saas-dashboard" | "internal-tool" | "service-api";
export type ArchitecturePreset = "local-first" | "api-first" | "event-driven";

export type GenerateProjectRequest = {
  name?: string;
  stack?: ProjectStack;
  template?: ProjectTemplate;
  architecturePreset?: ArchitecturePreset;
};

export type GeneratedFile = {
  path: string;
  content: string;
};

export type GenerateProjectResponse = {
  project: {
    name: string;
    slug: string;
    stack: ProjectStack;
    template: ProjectTemplate;
    architecturePreset: ArchitecturePreset;
  };
  structure: string[];
  files: GeneratedFile[];
  validation: {
    valid: true;
    checks: string[];
  };
};
