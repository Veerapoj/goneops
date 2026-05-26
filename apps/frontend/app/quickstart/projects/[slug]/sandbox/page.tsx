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
  automation?: { repositoryUrl: string; pipelineUrl: string; sandboxUrl: string; logs: string[]; sourceControl: string; cicd: string; runtime: string; workspacePath?: string; composeProject?: string };
  urls: { name: string; url: string }[];
  containerStatus: { service: string; status: string; health: string }[];
};

export default function QuickStartSandboxPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [status, setStatus] = useState("Loading sandbox status...");

  useEffect(() => {
    let active = true;
    async function loadProject() {
      try {
        const response = await fetch(`${getApiBase()}/quickstart/projects/${slug}`);
        if (response.ok) {
          const data = (await response.json()) as GeneratedProject;
          if (active) { setProject(data); setStatus("Sandbox metadata loaded from backend"); }
          return;
        }
      } catch {
        // Fall back to browser cache.
      }
      const cached = localStorage.getItem(`quickstart:${slug}`);
      if (cached && active) { setProject(JSON.parse(cached) as GeneratedProject); setStatus("Sandbox metadata loaded from browser cache"); return; }
      if (active) setStatus("Sandbox project not found. Generate it again from QuickStart.");
    }
    void loadProject();
    return () => { active = false; };
  }, [slug]);

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-8 text-[#111] sm:px-8 lg:px-10">
      <section className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between border-b border-[#eaeaea] pb-5">
          <div>
            <div className="text-sm font-semibold">QuickStart Sandbox</div>
            <div className="text-xs text-[#666]">{status}</div>
          </div>
          <Link className="rounded-full border border-[#dddddd] px-3 py-1 text-xs text-[#666666]" href={`/quickstart/projects/${slug}`}>Project files</Link>
        </nav>
        {project ? (
          <div className="grid gap-5 py-8">
            <section className="rounded-3xl border border-[#e5e5e5] bg-white p-6 shadow-xl shadow-black/5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#777]">Local-first Vercel sandbox</div>
              <h1 className="mt-3 text-3xl font-semibold">{project.project.name}</h1>
              <div className="mt-2 text-sm text-[#555]">{project.stackSummary}</div>
              <div className="mt-4 font-mono text-sm">/quickstart/projects/{project.project.slug}/sandbox</div>
              <div className="mt-2 font-mono text-xs text-[#666]">workspace: {project.automation?.workspacePath ?? "not persisted"}</div>
              <div className="mt-1 font-mono text-xs text-[#666]">compose: {project.automation?.composeProject ?? "not started"}</div>
            </section>
            <section className="grid gap-4 md:grid-cols-3">
              <Card title="Source Control" value={project.automation?.repositoryUrl ?? "Gitea pending"} />
              <Card title="CI/CD" value={project.automation?.pipelineUrl ?? "Woodpecker pending"} />
              <Card title="Runtime" value="Docker Compose sandbox" />
            </section>
            <section className="rounded-3xl border border-[#e5e5e5] bg-white p-6 shadow-xl shadow-black/5">
              <div className="text-sm font-semibold">Build and startup validation logs</div>
              <div className="mt-4 grid gap-2">
                {(project.automation?.logs ?? []).map((log) => <div key={log} className="rounded-xl bg-[#f7f7f7] p-3 font-mono text-xs text-[#444]">{log}</div>)}
                {project.containerStatus.map((item) => <div key={item.service} className="rounded-xl bg-[#f7f7f7] p-3 font-mono text-xs text-[#444]">{item.service}: {item.status} / {item.health}</div>)}
              </div>
            </section>
          </div>
        ) : <div className="py-10 text-sm text-[#666]">{status}</div>}
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return <div className="rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-xl shadow-black/5"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#777]">{title}</div><div className="mt-3 break-words font-mono text-xs text-[#333]">{value}</div></div>;
}
