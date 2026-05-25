"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function getApiBase() {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:4000`;
  return "http://localhost:4000";
}

type GeneratedProject = {
  project: { name: string; slug: string };
  stackSummary: string;
  readme: string;
  files: { path: string; content: string }[];
  generationLogs: string[];
  dockerCommands: string[];
  apiExamples: string[];
};

function defaultSelectedFilePath(project: GeneratedProject): string | null {
  return project.files.find((file) => file.path.endsWith("README.md"))?.path ?? project.files[0]?.path ?? null;
}

export default function QuickStartProjectPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading generated project...");

  useEffect(() => {
    let active = true;
    async function loadProject() {
      try {
        const apiBase = getApiBase();
        const response = await fetch(`${apiBase}/quickstart/projects/${slug}`);
        if (response.ok) {
          const data = (await response.json()) as GeneratedProject;
          if (active) {
            setProject(data);
            setSelectedFilePath(defaultSelectedFilePath(data));
            setStatus("Loaded from backend project URL");
          }
          return;
        }
      } catch {
        // Fall back to browser storage below.
      }
      const cached = localStorage.getItem(`quickstart:${slug}`);
      if (cached && active) {
        const cachedProject = JSON.parse(cached) as GeneratedProject;
        setProject(cachedProject);
        setSelectedFilePath(defaultSelectedFilePath(cachedProject));
        setStatus("Loaded from browser cache");
        return;
      }
      if (active) setStatus("Project not found. Generate it again from QuickStart.");
    }
    void loadProject();
    return () => {
      active = false;
    };
  }, [slug]);

  const selectedFile = project?.files.find((file) => file.path === selectedFilePath) ?? project?.files[0] ?? null;

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-8 text-[#111] sm:px-8 lg:px-10">
      <section className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between border-b border-[#eaeaea] pb-5">
          <div>
            <div className="text-sm font-semibold">GoneOps QuickStart Project</div>
            <div className="text-xs text-[#666]">{status}</div>
          </div>
          <Link className="rounded-full border border-[#dddddd] px-3 py-1 text-xs text-[#666666]" href="/quickstart">
            Create another project
          </Link>
        </nav>

        {project ? (
          <div className="grid gap-8 py-8 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-xl shadow-black/5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#777]">Project URL</div>
              <h1 className="mt-3 text-2xl font-semibold">{project.project.name}</h1>
              <div className="mt-2 font-mono text-xs text-[#666]">/quickstart/projects/{project.project.slug}</div>
              <div className="mt-4 text-sm text-[#555]">{project.stackSummary}</div>

              <div className="mt-6 text-xs font-semibold uppercase tracking-wide text-[#777]">Generated files</div>
              <div className="mt-3 grid gap-2">
                {project.files.map((file) => {
                  const selected = file.path === selectedFile?.path;
                  return (
                    <button
                      key={file.path}
                      className={`rounded-xl border px-3 py-2 text-left font-mono text-xs transition ${
                        selected ? "border-black bg-black text-white" : "border-[#eeeeee] text-[#333] hover:border-black hover:bg-[#fafafa]"
                      }`}
                      onClick={() => setSelectedFilePath(file.path)}
                      type="button"
                    >
                      {file.path}
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="rounded-3xl border border-[#e5e5e5] bg-white p-6 shadow-xl shadow-black/5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#777]">File Preview</div>
                  <div className="mt-1 font-mono text-sm text-[#666]">{selectedFile?.path ?? "No generated file selected"}</div>
                </div>
                {selectedFile ? <div className="rounded-full bg-[#f5f5f5] px-3 py-1 text-xs text-[#666]">Selected file</div> : null}
              </div>
              <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-[#050505] p-5 text-sm leading-6 text-[#ededed]">{selectedFile?.content ?? "Select a generated file to preview its content."}</pre>
            </section>
          </div>
        ) : (
          <div className="py-10 text-sm text-[#666]">{status}</div>
        )}
      </section>
    </main>
  );
}
