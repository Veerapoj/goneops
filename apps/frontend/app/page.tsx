const navItems = [
  { label: "Dashboard", status: "active" },
  { label: "Projects", status: "active" },
  { label: "Templates", status: "coming-soon" },
  { label: "Observability", status: "coming-soon" },
  { label: "Settings", status: "coming-soon" }
];

const statusItems = [
  { label: "Frontend", value: "Ready", detail: "Responsive shell" },
  { label: "Backend", value: "Ready", detail: "API validated" },
  { label: "Generator", value: "Phase 6", detail: "UI polish" },
  { label: "Local Services", value: "Compose", detail: "Healthy" }
];

const polishChecks = ["Responsive UI", "Dark mode ready", "Navigation works", "No broken pages"];
const stacks = ["next-nest", "api-worker", "static-site"];
const templates = ["saas-dashboard", "internal-tool", "service-api"];
const architecturePresets = ["local-first", "api-first", "event-driven"];

const mermaidPreview = `flowchart LR
  Developer[Developer] --> Project[Generated Project]
  Project --> Web[Web UI]
  Project --> Api[API Service]
  Api --> Database[(PostgreSQL)]`;

const generatedStructure = [
  "my-service/README.md",
  "my-service/docker-compose.yml",
  "my-service/.env.example",
  "my-service/apps/web/src/main.ts",
  "my-service/apps/api/src/main.ts",
  "my-service/docs/architecture.md",
  "my-service/docs/context-diagram.md",
  "my-service/docs/system-diagram.md",
  "my-service/docs/deployment-diagram.md",
  "my-service/docs/api-contract.md",
  "my-service/.gitignore",
  "my-service/.github/workflows/ci.yml",
  "my-service/scripts/init-git.sh",
  "my-service/apps/api/src/observability.ts",
  "my-service/apps/api/src/health.ts",
  "my-service/docs/observability.md"
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-panel/90 p-5 shadow-sm ${className}`}>{children}</section>;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[272px_1fr]">
        <aside className="sticky top-0 z-10 border-b border-border bg-panel/95 px-5 py-5 backdrop-blur lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white shadow-sm">
                GO
              </div>
              <div>
                <div className="text-base font-semibold">GoneOps</div>
                <div className="text-xs text-muted">Local IDP</div>
              </div>
            </div>
            <div className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted lg:mt-5 lg:inline-flex">
              Dark mode ready
            </div>
          </div>

          <nav aria-label="Primary navigation" className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const active = item.status === "active";
              return (
                <a
                  key={item.label}
                  aria-current={active && item.label === "Projects" ? "page" : undefined}
                  className={`flex min-w-fit items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : "border border-transparent text-muted hover:border-border hover:bg-background hover:text-foreground"
                  }`}
                  href="#"
                >
                  <span>{item.label}</span>
                  {!active ? <span className="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide">Coming Soon</span> : null}
                </a>
              );
            })}
          </nav>
        </aside>

        <section className="px-4 py-5 sm:px-6 md:px-8 lg:px-10">
          <header className="rounded-3xl border border-border bg-panel/80 p-6 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-background px-3 py-1 text-xs font-medium text-muted">
                Phase 6 — UI Polish
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Project Generator</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
                Create standardized local-first projects with responsive navigation, consistent cards, dark-mode-ready colors, and validated generation output.
              </p>
            </div>
            <button className="mt-5 h-11 w-full rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 md:mt-0 md:w-auto">
              Generate Project
            </button>
          </header>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statusItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-panel/90 p-4 shadow-sm">
                <div className="text-sm text-muted">{item.label}</div>
                <div className="mt-2 text-xl font-semibold">{item.value}</div>
                <div className="mt-1 text-xs text-muted">{item.detail}</div>
              </div>
            ))}
          </div>

          <Card className="mt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">UI Polish QA Checklist</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Phase 6 focuses on DX, visual consistency, responsive behavior, navigation clarity, and no broken pages.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {polishChecks.map((check) => (
                  <span key={check} className="rounded-full border border-border bg-background px-3 py-2 text-center text-xs font-medium">
                    {check}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <h2 className="text-lg font-semibold">Create Project UI</h2>
              <form className="mt-4 grid gap-4" aria-label="Create Project Wizard">
                <label className="grid gap-2 text-sm font-medium">
                  Project name
                  <input className="rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-accent/30 focus:ring-2" defaultValue="My Service" name="projectName" />
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-2 text-sm font-medium">
                    Stack selection
                    <select className="rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-accent/30 focus:ring-2" name="stack">
                      {stacks.map((stack) => (
                        <option key={stack}>{stack}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium">
                    Template selection
                    <select className="rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-accent/30 focus:ring-2" name="template">
                      {templates.map((template) => (
                        <option key={template}>{template}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium">
                    Architecture preset
                    <select className="rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none ring-accent/30 focus:ring-2" name="architecturePreset">
                      {architecturePresets.map((preset) => (
                        <option key={preset}>{preset}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </form>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">Generated Structure Preview</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Backend endpoint <code>POST /projects/generate</code> validates inputs and returns generated files without writing secrets.
              </p>
              <ul className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1 text-sm sm:grid-cols-2 xl:grid-cols-1">
                {generatedStructure.map((path) => (
                  <li key={path} className="rounded-xl bg-background px-3 py-2 font-mono text-xs text-muted">
                    {path}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="xl:col-span-2">
              <h2 className="text-lg font-semibold">Design Generator Preview</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Phase 3 adds Mermaid generation for context, system, and deployment diagrams plus an API contract document.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <pre className="overflow-x-auto rounded-2xl bg-background p-4 text-xs leading-6 text-foreground">
                  <code>{mermaidPreview}</code>
                </pre>
                <div className="rounded-2xl border border-border bg-background p-4 text-sm leading-6">
                  <div className="font-semibold">Generated docs</div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
                    <li>Context diagram generation</li>
                    <li>System diagram generation</li>
                    <li>Deployment diagram generation</li>
                    <li>API contract documentation</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="xl:col-span-2">
              <h2 className="text-lg font-semibold">Git + CI/CD Preview</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Phase 4 adds local Git bootstrap files and a GitHub Actions CI workflow to generated project output.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-background p-4 text-sm">Git initialization script</div>
                <div className="rounded-xl bg-background p-4 text-sm">Initial commit generation</div>
                <div className="rounded-xl bg-background p-4 text-sm">CI workflow template</div>
              </div>
            </Card>

            <Card className="xl:col-span-2">
              <h2 className="text-lg font-semibold">Observability Baseline Preview</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Phase 5 adds structured logging, request_id, trace_id, health checks, readiness/liveness endpoints, and OpenTelemetry starter output.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-background p-4 text-sm">Structured JSON logging</div>
                <div className="rounded-xl bg-background p-4 text-sm">OpenTelemetry baseline</div>
                <div className="rounded-xl bg-background p-4 text-sm">Health readiness liveness endpoints</div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
