const navItems = ["Dashboard", "Projects", "Templates", "Observability", "Settings"];

const statusItems = [
  { label: "Frontend", value: "Ready" },
  { label: "Backend", value: "Ready" },
  { label: "Generator", value: "Phase 2" },
  { label: "Local Services", value: "Compose" }
];

const stacks = ["next-nest", "api-worker", "static-site"];
const templates = ["saas-dashboard", "internal-tool", "service-api"];
const architecturePresets = ["local-first", "api-first", "event-driven"];

const generatedStructure = [
  "my-service/README.md",
  "my-service/docker-compose.yml",
  "my-service/.env.example",
  "my-service/apps/web/src/main.ts",
  "my-service/apps/api/src/main.ts",
  "my-service/docs/architecture.md"
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[248px_1fr]">
        <aside className="border-b border-border bg-panel px-5 py-5 md:border-b-0 md:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-accent text-sm font-bold text-white">
              GO
            </div>
            <div>
              <div className="text-base font-semibold">GoneOps</div>
              <div className="text-xs text-muted">Local IDP</div>
            </div>
          </div>
          <nav className="mt-8 flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {navItems.map((item, index) => (
              <a
                key={item}
                className={`whitespace-nowrap rounded px-3 py-2 text-sm ${
                  index <= 1
                    ? "bg-foreground text-white"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
                href="#"
              >
                {index > 1 ? "Coming Soon" : item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="px-5 py-6 md:px-8 lg:px-10">
          <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">Project Generator</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Create standardized local-first projects with an allowlisted stack, template, and architecture preset.
              </p>
            </div>
            <button className="h-10 rounded bg-accent px-4 text-sm font-semibold text-white">
              Generate Project
            </button>
          </header>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statusItems.map((item) => (
              <div key={item.label} className="rounded border border-border bg-panel p-4">
                <div className="text-sm text-muted">{item.label}</div>
                <div className="mt-2 text-xl font-semibold">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded border border-border bg-panel p-5">
              <h2 className="text-lg font-semibold">Create Project UI</h2>
              <form className="mt-4 grid gap-4" aria-label="Create Project Wizard">
                <label className="grid gap-2 text-sm">
                  Project name
                  <input
                    className="rounded border border-border bg-background px-3 py-2 text-foreground"
                    defaultValue="My Service"
                    name="projectName"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  Stack selection
                  <select className="rounded border border-border bg-background px-3 py-2 text-foreground" name="stack">
                    {stacks.map((stack) => (
                      <option key={stack}>{stack}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  Template selection
                  <select className="rounded border border-border bg-background px-3 py-2 text-foreground" name="template">
                    {templates.map((template) => (
                      <option key={template}>{template}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  Architecture preset
                  <select className="rounded border border-border bg-background px-3 py-2 text-foreground" name="architecturePreset">
                    {architecturePresets.map((preset) => (
                      <option key={preset}>{preset}</option>
                    ))}
                  </select>
                </label>
              </form>
            </section>

            <section className="rounded border border-border bg-panel p-5">
              <h2 className="text-lg font-semibold">Generated Structure Preview</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Backend endpoint <code>POST /projects/generate</code> validates inputs and returns generated files without writing secrets.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {generatedStructure.map((path) => (
                  <li key={path} className="rounded bg-background px-3 py-2 font-mono text-xs">
                    {path}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
