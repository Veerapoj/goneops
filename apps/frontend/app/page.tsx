const navItems = [
  { label: "Workspace", status: "active" },
  { label: "Project Brain", status: "active" },
  { label: "SDLC Flow", status: "active" },
  { label: "Templates", status: "coming-soon" },
  { label: "Settings", status: "coming-soon" }
];

const brainSignals = [
  { label: "Project state", value: "Alive", detail: "MVP validated, local services healthy" },
  { label: "Current phase", value: "Post-MVP", detail: "E2E hardening + product evolution" },
  { label: "Current task", value: "Living workspace UI", detail: "Reframing GoneOps as an active project brain" },
  { label: "Memory state", value: "Persistent", detail: "46 records across memory/tasks/progress/logs/context/history" },
  { label: "QA state", value: "Green", detail: "qa:mvp + e2e:mvp passed" },
  { label: "Git activity", value: "Synced", detail: "origin/main at 55a307f" }
];

const agents = [
  { name: "Planner Agent", state: "planning", activity: "Translating goals into smallest safe increments" },
  { name: "Generator Agent", state: "generating", activity: "Maintaining project, docs, Git/CI, and observability output" },
  { name: "QA Agent", state: "validating", activity: "Running build, lint, tests, runtime checks, and E2E" },
  { name: "Memory Agent", state: "remembering", activity: "Writing task, progress, log, context, and history records" }
];

const decisions = [
  "Local-first MVP before external platform integrations",
  "Generator returns validated files; disk persistence/download remains post-MVP",
  "Git/CI generation is local template output, not remote GitHub execution",
  "Observability baseline is local structured logging and starter contracts"
];

const workflow = [
  { step: "Understand", status: "done", detail: "Read roadmap, architecture, phases, task rules" },
  { step: "Plan", status: "done", detail: "Select smallest safe increment" },
  { step: "Generate", status: "active", detail: "Evolve UI, generated project contracts, records" },
  { step: "Validate", status: "active", detail: "QA gates, runtime checks, E2E checks" },
  { step: "Remember", status: "active", detail: "Persist decisions, progress, logs, history" },
  { step: "Commit", status: "done", detail: "Meaningful Git checkpoints on origin/main" }
];

const timeline = [
  { label: "Phase 1", event: "Foundation committed" },
  { label: "Phase 2", event: "Project generator API/UI validated" },
  { label: "Phase 3", event: "Architecture and Mermaid docs generated" },
  { label: "Phase 4", event: "Git bootstrap and CI workflow generated" },
  { label: "Phase 5", event: "Observability baseline validated" },
  { label: "Phase 6", event: "Responsive UI polish completed" },
  { label: "E2E", event: "MVP end-to-end validation passed" },
  { label: "Now", event: "Workspace is becoming a living AI project brain" }
];

const generatedStructure = [
  "README.md",
  "docker-compose.yml",
  ".env.example",
  "docs/architecture.md",
  "docs/context-diagram.md",
  "docs/system-diagram.md",
  "docs/deployment-diagram.md",
  "docs/api-contract.md",
  ".github/workflows/ci.yml",
  "scripts/init-git.sh",
  "apps/api/src/observability.ts",
  "apps/api/src/health.ts",
  "docs/observability.md"
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-panel/90 p-5 shadow-sm ${className}`}>{children}</section>;
}

function Pulse() {
  return <span className="inline-flex h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_18px_var(--accent)]" />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[288px_1fr]">
        <aside className="sticky top-0 z-10 border-b border-border bg-panel/95 px-5 py-5 backdrop-blur lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-white shadow-sm">
                AI
              </div>
              <div>
                <div className="text-base font-semibold">GoneOps Brain</div>
                <div className="flex items-center gap-2 text-xs text-muted"><Pulse /> active SDLC workspace</div>
              </div>
            </div>
            <div className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted lg:mt-5 lg:inline-flex">
              AI is planning • validating • remembering
            </div>
          </div>

          <nav aria-label="Primary navigation" className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map((item) => {
              const active = item.status === "active";
              return (
                <a
                  key={item.label}
                  aria-current={active && item.label === "Workspace" ? "page" : undefined}
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

          <div className="mt-8 rounded-2xl border border-border bg-background p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Live heartbeat</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between"><span>Planning</span><Pulse /></div>
              <div className="flex items-center justify-between"><span>Generating</span><Pulse /></div>
              <div className="flex items-center justify-between"><span>Validating</span><Pulse /></div>
              <div className="flex items-center justify-between"><span>Remembering</span><Pulse /></div>
            </div>
          </div>
        </aside>

        <section className="px-4 py-5 sm:px-6 md:px-8 lg:px-10">
          <header className="relative overflow-hidden rounded-3xl border border-border bg-panel/80 p-6 shadow-sm">
            <div className="absolute right-6 top-6 hidden rounded-full border border-border bg-background px-3 py-1 text-xs text-muted md:block">
              Living AI engineering workspace
            </div>
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs font-medium text-muted">
                <Pulse /> Active project brain
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">GoneOps is evolving the project continuously.</h1>
              <p className="mt-4 text-sm leading-6 text-muted md:text-base">
                Not a static template generator: this workspace shows project state, current phase, current task, memory state, QA state, AI agent activity, architecture decisions, workflow progress, git activity, and the generation timeline.
              </p>
            </div>
          </header>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {brainSignals.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-panel/90 p-4 shadow-sm">
                <div className="flex items-center justify-between text-sm text-muted"><span>{item.label}</span><Pulse /></div>
                <div className="mt-2 text-2xl font-semibold">{item.value}</div>
                <div className="mt-1 text-xs leading-5 text-muted">{item.detail}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <h2 className="text-lg font-semibold">AI Agent Activity</h2>
              <p className="mt-2 text-sm leading-6 text-muted">A living workspace should make the invisible SDLC loop visible.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {agents.map((agent) => (
                  <div key={agent.name} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{agent.name}</div>
                      <span className="rounded-full bg-panel px-2 py-1 text-[10px] uppercase tracking-wide text-muted">{agent.state}</span>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-muted">{agent.activity}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">Current Task Focus</h2>
              <div className="mt-4 rounded-2xl bg-background p-4">
                <div className="text-xs uppercase tracking-wide text-muted">Now executing</div>
                <div className="mt-2 text-xl font-semibold">Make the system feel alive</div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Reposition the homepage around active planning, generation, validation, memory, architecture decisions, Git checkpoints, and timeline—not only project template output.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-background p-3"><div className="text-muted">Phase</div><div className="font-semibold">Post-MVP</div></div>
                <div className="rounded-xl bg-background p-3"><div className="text-muted">QA</div><div className="font-semibold">Green</div></div>
              </div>
            </Card>

            <Card className="xl:col-span-2">
              <h2 className="text-lg font-semibold">Workflow Progress</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                {workflow.map((item) => (
                  <div key={item.step} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Pulse /> {item.step}</div>
                    <div className="mt-2 text-[10px] uppercase tracking-wide text-muted">{item.status}</div>
                    <div className="mt-3 text-xs leading-5 text-muted">{item.detail}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">Architecture Decisions</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
                {decisions.map((decision) => (
                  <li key={decision} className="rounded-xl bg-background p-3">{decision}</li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">Memory State</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Persistent records keep the project resumable after interruption.</p>
              <div className="mt-4 grid gap-2 text-sm">
                {['/tasks', '/progress', '/logs', '/memory', '/context', '/history'].map((path) => (
                  <div key={path} className="flex items-center justify-between rounded-xl bg-background px-3 py-2">
                    <span className="font-mono text-xs">{path}</span>
                    <span className="text-xs text-muted">updated</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">QA State</h2>
              <div className="mt-4 space-y-3 text-sm">
                {['Build passes', 'Lint passes', 'Backend tests pass', 'Frontend tests pass', 'Runtime API/UI validated', 'E2E MVP passed', 'Secret scan passed'].map((check) => (
                  <div key={check} className="flex items-center gap-3 rounded-xl bg-background p-3"><Pulse /> {check}</div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">Git Activity</h2>
              <div className="mt-4 rounded-2xl bg-background p-4 font-mono text-xs leading-6 text-muted">
                <div>origin/main synced</div>
                <div>55a307f test: add MVP end-to-end validation</div>
                <div>adf34b1 docs: add mvp release checkpoint</div>
                <div>c41c655 feat: polish phase 6 ui</div>
              </div>
            </Card>

            <Card className="xl:col-span-2">
              <h2 className="text-lg font-semibold">Generation Timeline</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {timeline.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border bg-background p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</div>
                    <div className="mt-2 text-sm leading-6">{item.event}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="xl:col-span-2">
              <h2 className="text-lg font-semibold">Project Generator Output</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Template generation remains available, but it is now framed as one capability inside the active SDLC brain.
              </p>
              <ul className="mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1 text-sm sm:grid-cols-2 xl:grid-cols-3">
                {generatedStructure.map((path) => (
                  <li key={path} className="rounded-xl bg-background px-3 py-2 font-mono text-xs text-muted">
                    {path}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
