const navItems = ["Dashboard", "Projects", "Templates", "Observability", "Settings"];

const statusItems = [
  { label: "Frontend", value: "Ready" },
  { label: "Backend", value: "Ready" },
  { label: "Memory", value: "Persisted" },
  { label: "Local Services", value: "Compose" }
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
                  index === 0
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
              <h1 className="text-3xl font-semibold tracking-normal">Developer Platform</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Create standardized projects, preserve engineering context, and keep local infrastructure visible from one workspace.
              </p>
            </div>
            <button className="h-10 rounded bg-accent px-4 text-sm font-semibold text-white">
              Create Project
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

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded border border-border bg-panel p-5">
              <h2 className="text-lg font-semibold">Phase 1 Foundation</h2>
              <div className="mt-4 divide-y divide-border">
                {["Repository initialized", "Frontend shell", "Backend foundation", "Persistent memory", "Task tracking"].map(
                  (task) => (
                    <div key={task} className="flex items-center justify-between py-3 text-sm">
                      <span>{task}</span>
                      <span className="rounded bg-background px-2 py-1 text-xs text-accent">Ready</span>
                    </div>
                  )
                )}
              </div>
            </section>

            <section className="rounded border border-border bg-panel p-5">
              <h2 className="text-lg font-semibold">Next Workflow</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Project generation opens after the foundation QA gate passes. Non-MVP areas remain simple placeholders until their phase begins.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
