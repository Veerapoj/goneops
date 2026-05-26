"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function getApiBase() {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:4000`;
  return "http://localhost:4000";
}
const stacks = ["NestJS", "NextJS", "Go Fiber", "FastAPI"];
const databases = ["PostgreSQL", "MySQL", "MongoDB", "None"];
const caches = ["Redis", "None"];
const queues = ["RabbitMQ", "None"];
const projectIndexKey = "quickstart:projects";

type ProjectSummary = { name: string; slug: string; url: string; stackSummary: string; generatedAt: string; fileCount: number; sandboxUrl?: string; repositoryUrl?: string; pipelineUrl?: string; workspacePath?: string; composeProject?: string };

type GenerateResponse = {
  project: { name: string; slug: string; url: string; generatedAt: string };
  stackSummary: string;
  readme: string;
  files: { path: string; content: string }[];
  generationLogs: string[];
  automation: { repositoryUrl: string; pipelineUrl: string; sandboxUrl: string; logs: string[]; sourceControl: string; cicd: string; runtime: string; workspacePath?: string; composeProject?: string };
};

function projectSummaryFromGenerated(generated: GenerateResponse): ProjectSummary {
  return {
    name: generated.project.name,
    slug: generated.project.slug,
    url: generated.project.url,
    stackSummary: generated.stackSummary,
    generatedAt: generated.project.generatedAt,
    fileCount: generated.files.length,
    sandboxUrl: generated.automation.sandboxUrl,
    repositoryUrl: generated.automation.repositoryUrl,
    pipelineUrl: generated.automation.pipelineUrl,
    workspacePath: generated.automation.workspacePath,
    composeProject: generated.automation.composeProject
  };
}

function mergeProjects(projects: ProjectSummary[]): ProjectSummary[] {
  const bySlug = new Map<string, ProjectSummary>();
  for (const project of projects) bySlug.set(project.slug, project);
  return [...bySlug.values()].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

function readLocalProjectIndex(): ProjectSummary[] {
  if (typeof window === "undefined") return [];
  const cached = localStorage.getItem(projectIndexKey);
  if (!cached) return [];
  try {
    return JSON.parse(cached) as ProjectSummary[];
  } catch {
    return [];
  }
}

function writeLocalProjectIndex(projects: ProjectSummary[]) {
  localStorage.setItem(projectIndexKey, JSON.stringify(mergeProjects(projects)));
}

export default function QuickStartPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("goneops-demo");
  const [stack, setStack] = useState("NestJS");
  const [database, setDatabase] = useState("MySQL");
  const [cache, setCache] = useState("Redis");
  const [queue, setQueue] = useState("RabbitMQ");
  const [includeReadme, setIncludeReadme] = useState(true);
  const [includeDockerCompose, setIncludeDockerCompose] = useState(true);
  const [includeCi, setIncludeCi] = useState(true);
  const [includeHelloWorld, setIncludeHelloWorld] = useState(true);
  const [status, setStatus] = useState("Ready to generate");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const apiBase = getApiBase();
  const selectedProject = projects.find((project) => project.slug === selectedProjectSlug) ?? projects[0] ?? null;
  const deleteReady = Boolean(selectedProject && deleteConfirmation === selectedProject.name);

  useEffect(() => {
    let active = true;
    async function loadProjects() {
      const localProjects = readLocalProjectIndex();
      if (active) {
        setProjects(localProjects);
        setSelectedProjectSlug((current) => current ?? localProjects[0]?.slug ?? null);
      }
      try {
        const response = await fetch(`${apiBase}/quickstart/projects`);
        if (!response.ok) return;
        const data = (await response.json()) as { projects: ProjectSummary[] };
        const merged = mergeProjects([...data.projects, ...readLocalProjectIndex()]);
        writeLocalProjectIndex(merged);
        if (active) {
          setProjects(merged);
          setSelectedProjectSlug((current) => current ?? merged[0]?.slug ?? null);
        }
      } catch {
        // Keep browser-cached project list when backend is unavailable.
      }
    }
    void loadProjects();
    return () => {
      active = false;
    };
  }, [apiBase]);

  async function generateProject() {
    setStatus("Generating project from backend API...");
    setResult(null);
    const response = await fetch(`${apiBase}/quickstart/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        stack,
        database,
        cache,
        queue,
        includeReadme,
        includeDockerCompose,
        includeCi,
        includeHelloWorld
      })
    });
    if (!response.ok) {
      const text = await response.text();
      setStatus(`Generation failed: ${text}`);
      return;
    }
    const generated = (await response.json()) as GenerateResponse;
    const generatedSummary = projectSummaryFromGenerated(generated);
    const merged = mergeProjects([generatedSummary, ...projects]);
    localStorage.setItem(`quickstart:${generated.project.slug}`, JSON.stringify(generated));
    writeLocalProjectIndex(merged);
    setProjects(merged);
    setSelectedProjectSlug(generated.project.slug);
    setResult(generated);
    setStatus(`Generated ${generated.project.slug} with isolated sandbox ${generated.automation.composeProject ?? "pending"}`);
    router.push(generated.project.url);
  }

  async function deleteSelectedProject() {
    if (!selectedProject) return;
    if (deleteConfirmation !== selectedProject.name) {
      setStatus("Type the exact project name before deleting");
      return;
    }
    setStatus(`Deleting ${selectedProject.slug}...`);
    try {
      const response = await fetch(`${apiBase}/quickstart/projects/${selectedProject.slug}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmationName: deleteConfirmation })
      });
      if (!response.ok && response.status !== 404) {
        setStatus(`Delete failed: ${await response.text()}`);
        return;
      }
    } catch {
      // Still remove browser-cached data so stale project data is not shown locally.
    }
    localStorage.removeItem(`quickstart:${selectedProject.slug}`);
    const nextProjects = projects.filter((project) => project.slug !== selectedProject.slug);
    writeLocalProjectIndex(nextProjects);
    setProjects(nextProjects);
    setSelectedProjectSlug(nextProjects[0]?.slug ?? null);
    setDeleteConfirmation("");
    if (result?.project.slug === selectedProject.slug) setResult(null);
    setStatus(`Deleted ${selectedProject.slug}`);
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#111111]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-b border-[#eaeaea] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-xs font-bold text-white">GO</div>
            <div>
              <div className="font-semibold">GoneOps QuickStart Edition</div>
              <div className="text-xs text-[#666666]">Local-first Vercel for backend stacks</div>
            </div>
          </div>
          <Link className="rounded-full border border-[#dddddd] px-3 py-1 text-xs text-[#666666]" href="/">
            Advanced workspace
          </Link>
        </nav>

        <div className="grid gap-8 py-10 lg:grid-cols-[1fr_420px]">
          <section className="rounded-[28px] border border-[#e5e5e5] bg-white p-6 shadow-2xl shadow-black/5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#777]">Create Project</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Generate, push, build, and sandbox locally.</h1>
            <p className="mt-3 text-sm leading-6 text-[#666]">QuickStart now targets a fully local self-hosted path: Gitea source control, Woodpecker CI, Docker Compose runtime, and an automatic sandbox URL after generation.</p>

            <label className="mt-8 block text-sm font-semibold" htmlFor="quickstart-project-name">Project Name:</label>
            <input id="quickstart-project-name" className="mt-2 w-full rounded-xl border border-[#dddddd] px-4 py-3 font-mono text-sm outline-none focus:border-black" value={projectName} onChange={(event) => setProjectName(event.target.value)} />

            <RadioGroup title="Stack:" items={stacks} selected={stack} onSelect={setStack} />
            <RadioGroup title="Database:" items={databases} selected={database} onSelect={setDatabase} />
            <RadioGroup title="Cache:" items={caches} selected={cache} onSelect={setCache} />
            <RadioGroup title="Queue:" items={queues} selected={queue} onSelect={setQueue} />

            <div className="mt-6 grid gap-3 rounded-2xl border border-[#eeeeee] bg-[#fbfbfb] p-4">
              <Checkbox label="Generate README" checked={includeReadme} onChange={setIncludeReadme} />
              <Checkbox label="Generate Docker Compose" checked={includeDockerCompose} onChange={setIncludeDockerCompose} />
              <Checkbox label="Generate Woodpecker CI/CD" checked={includeCi} onChange={setIncludeCi} />
              <Checkbox label="Generate Hello World" checked={includeHelloWorld} onChange={setIncludeHelloWorld} />
            </div>

            <button className="mt-6 w-full rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5" onClick={generateProject} type="button">
              Generate Project
            </button>

            <section className="mt-8 rounded-3xl border border-[#eeeeee] bg-[#fbfbfb] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Created Projects</div>
                  <div className="text-xs text-[#666]">Select a generated project, type its name, then delete all cached/backend data.</div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs text-[#666]">{projects.length} project(s)</div>
              </div>

              {projects.length ? (
                <div className="mt-4 grid gap-3">
                  {projects.map((project) => {
                    const selected = project.slug === selectedProject?.slug;
                    return (
                      <div
                        key={project.slug}
                        className={`rounded-2xl border p-4 text-left transition ${selected ? "border-black bg-white" : "border-[#e5e5e5] bg-white/70 hover:border-black"}`}
                      >
                        <button
                          className="w-full text-left"
                          onClick={() => {
                            setSelectedProjectSlug(project.slug);
                            setDeleteConfirmation("");
                          }}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">{project.name}</div>
                              <div className="mt-1 font-mono text-xs text-[#666]">{project.slug}</div>
                            </div>
                            <div className="rounded-full bg-[#f5f5f5] px-2 py-1 text-xs text-[#777]">{project.fileCount} files</div>
                          </div>
                          <div className="mt-2 text-xs text-[#666]">{project.stackSummary}</div>
                        </button>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Link className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-800" href={project.url}>
                            Open project page
                          </Link>
                          <Link className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-xs font-semibold text-sky-800" href={project.sandboxUrl ?? `${project.url}/sandbox`}>
                            Open sandbox
                          </Link>
                        </div>
                        {selected ? (
                          <div className="mt-3 grid gap-1 rounded-xl bg-[#fafafa] p-3 font-mono text-[11px] text-[#666]">
                            <div>project: {project.url}</div>
                            <div>sandbox: {project.sandboxUrl ?? `${project.url}/sandbox`}</div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {selectedProject ? (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                      <div className="text-sm font-semibold text-red-900">Delete project</div>
                      <p className="mt-1 text-xs leading-5 text-red-800">Type <span className="font-mono font-semibold">{selectedProject.name}</span> to confirm deletion. This removes the backend project entry and browser cached generated files.</p>
                      <label className="mt-3 block text-xs font-semibold text-red-900" htmlFor="delete-project-confirmation">Confirm project name</label>
                      <input
                        id="delete-project-confirmation"
                        className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-red-600"
                        onChange={(event) => setDeleteConfirmation(event.target.value)}
                        placeholder={selectedProject.name}
                        value={deleteConfirmation}
                      />
                      <button
                        className="mt-3 w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-200"
                        disabled={!deleteReady}
                        onClick={deleteSelectedProject}
                        type="button"
                      >
                        Delete selected project
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[#dddddd] bg-white p-4 text-sm text-[#666]">No created projects yet. Generate a project to manage it here.</div>
              )}
            </section>
          </section>

          <aside className="rounded-[28px] border border-[#e5e5e5] bg-white p-5 shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Local-first automation</div>
                <div className="text-xs text-[#666666]">{stack} + {database} + {cache} + {queue}</div>
              </div>
              <div className="rounded-full bg-[#f5f5f5] px-3 py-1 text-xs text-[#666666]">{status}</div>
            </div>

            <div className="mt-5 rounded-2xl bg-[#050505] p-4 font-mono text-xs leading-6 text-[#ededed]">
              <div>POST {apiBase}/quickstart/generate</div>
              <div>Project URL: /quickstart/projects/goneops-demo</div>
              <div>Sandbox URL: /quickstart/projects/goneops-demo/sandbox</div>
              <div>Gitea → Woodpecker CI → Docker Compose</div>
            </div>

            {result ? (
              <div className="mt-5 grid gap-3 text-sm">
                <Link className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-800" href={result.project.url}>
                  Open generated project: {result.project.slug}
                </Link>
                <Link className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 font-semibold text-sky-800" href={result.automation.sandboxUrl}>
                  Open sandbox URL: {result.automation.sandboxUrl}
                </Link>
                <div className="text-xs text-[#666]">{result.stackSummary}</div>
                <div className="rounded-xl bg-[#f7f7f7] p-3 text-xs text-[#555]">{result.automation.sourceControl} → {result.automation.cicd} → {result.automation.runtime}</div>
                <div className="rounded-xl bg-[#f7f7f7] p-3 font-mono text-xs text-[#555]">Workspace: {result.automation.workspacePath ?? "not persisted yet"}</div>
                <div className="rounded-xl bg-[#f7f7f7] p-3 font-mono text-xs text-[#555]">Compose project: {result.automation.composeProject ?? "not started yet"}</div>
                <div className="rounded-xl bg-[#f7f7f7] p-3 font-mono text-xs text-[#555]">Gitea repo: {result.automation.repositoryUrl}</div>
                <div className="rounded-xl bg-[#f7f7f7] p-3 font-mono text-xs text-[#555]">Woodpecker pipeline: {result.automation.pipelineUrl}</div>
                {result.generationLogs.map((log) => <div key={log} className="font-mono text-xs">{log}</div>)}
                {result.automation.logs.map((log) => <div key={log} className="font-mono text-xs text-[#444]">{log}</div>)}
              </div>
            ) : (
              <div className="mt-5 text-sm leading-6 text-[#666]">No generated project yet. Fill the form and click Generate Project.</div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function RadioGroup({ title, items, selected, onSelect }: { title: string; items: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div className="mt-6">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label key={item} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#eeeeee] px-3 py-2 text-sm hover:border-black">
            <input checked={selected === item} name={title} onChange={() => onSelect(item)} type="radio" />
            {item}
          </label>
        ))}
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}
