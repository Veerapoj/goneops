"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function getApiBase() {
  if (process.env.NEXT_PUBLIC_BACKEND_URL) return process.env.NEXT_PUBLIC_BACKEND_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:4000`;
  return "http://localhost:4000";
}

function externalizeLocalUrl(url?: string) {
  if (!url) return "";
  if (typeof window === "undefined") return url;
  return url.replace("http://localhost:", `${window.location.protocol}//${window.location.hostname}:`).replace("http://127.0.0.1:", `${window.location.protocol}//${window.location.hostname}:`);
}

type GeneratedProject = {
  project: { name: string; slug: string };
  stackSummary: string;
  automation?: { repositoryUrl: string; pipelineUrl: string; sandboxUrl: string; liveFrontendUrl?: string; liveApiUrl?: string; logs: string[]; sourceControl: string; cicd: string; runtime: string; workspacePath?: string; composeProject?: string };
  urls: { name: string; url: string }[];
  containerStatus: { service: string; status: string; health: string }[];
};

export default function QuickStartSandboxPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [status, setStatus] = useState("Loading generated demo application...");

  useEffect(() => {
    let active = true;
    async function loadProject() {
      try {
        const response = await fetch(`${getApiBase()}/quickstart/projects/${slug}`);
        if (response.ok) {
          const data = (await response.json()) as GeneratedProject;
          if (active) { setProject(data); setStatus("Live generated demo application loaded"); }
          return;
        }
      } catch {
        // Fall back to browser cache.
      }
      const cached = localStorage.getItem(`quickstart:${slug}`);
      if (cached && active) { setProject(JSON.parse(cached) as GeneratedProject); setStatus("Live generated demo application loaded from browser cache"); return; }
      if (active) setStatus("Sandbox project not found. Generate it again from QuickStart.");
    }
    void loadProject();
    return () => { active = false; };
  }, [slug]);

  const liveFrontendUrl = useMemo(() => externalizeLocalUrl(project?.automation?.liveFrontendUrl), [project?.automation?.liveFrontendUrl]);
  const liveApiUrl = useMemo(() => externalizeLocalUrl(project?.automation?.liveApiUrl), [project?.automation?.liveApiUrl]);

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-8 text-[#111] sm:px-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <nav className="flex items-center justify-between border-b border-[#eaeaea] pb-5">
          <div>
            <div className="text-sm font-semibold">QuickStart Sandbox</div>
            <div className="text-xs text-[#666]">{status}</div>
          </div>
          <Link className="rounded-full border border-[#dddddd] px-3 py-1 text-xs text-[#666666]" href={`/quickstart/projects/${slug}`}>Project files</Link>
        </nav>
        {project ? (
          <div className="grid gap-5 py-8">
            <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl shadow-black/5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Generated demo application</div>
                  <h1 className="mt-3 text-3xl font-semibold">{project.project.name}</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#555]">This primary panel renders the real generated frontend app. Use its buttons and forms to call the generated backend API, create/read database jobs, set/get Redis state, and publish/consume RabbitMQ messages when selected.</p>
                </div>
                <div className="grid gap-2 text-xs">
                  <a className="rounded-xl bg-black px-4 py-2 text-center font-semibold text-white" href={liveFrontendUrl} rel="noreferrer" target="_blank">Open live app</a>
                  <a className="rounded-xl border border-[#dddddd] px-4 py-2 text-center font-semibold text-[#444]" href={`${liveApiUrl}/health`} rel="noreferrer" target="_blank">API health</a>
                </div>
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
                {liveFrontendUrl ? (
                  <iframe className="h-[720px] w-full bg-white" src={liveFrontendUrl} title={`${project.project.name} live generated frontend application`} />
                ) : (
                  <div className="p-6 text-sm text-[#666]">Live frontend URL is not available yet. Regenerate with live automation enabled.</div>
                )}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              <Card title="Live frontend" value={liveFrontendUrl || "pending"} />
              <Card title="Live API" value={liveApiUrl || "pending"} />
              <Card title="Source Control" value={project.automation?.repositoryUrl ?? "Gitea pending"} />
              <Card title="Runtime" value={project.automation?.composeProject ?? "Docker Compose sandbox"} />
            </section>

            <section className="rounded-3xl border border-[#e5e5e5] bg-white p-6 shadow-xl shadow-black/5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#777]">Secondary infrastructure details</div>
              <h2 className="mt-2 text-lg font-semibold">Logs, service status, and metadata</h2>
              <div className="mt-4 grid gap-2 font-mono text-xs text-[#444]">
                <div className="rounded-xl bg-[#f7f7f7] p-3">stack: {project.stackSummary}</div>
                <div className="rounded-xl bg-[#f7f7f7] p-3">workspace: {project.automation?.workspacePath ?? "not persisted"}</div>
                <div className="rounded-xl bg-[#f7f7f7] p-3">pipeline: {project.automation?.pipelineUrl ?? "Woodpecker pending"}</div>
                {(project.automation?.logs ?? []).map((log) => <div key={log} className="rounded-xl bg-[#f7f7f7] p-3">{log}</div>)}
                {project.containerStatus.map((item) => <div key={item.service} className="rounded-xl bg-[#f7f7f7] p-3">{item.service}: {item.status} / {item.health}</div>)}
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
