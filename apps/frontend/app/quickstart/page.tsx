"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:4100";
const stacks = ["NestJS", "NextJS", "Go Fiber", "FastAPI"];
const databases = ["PostgreSQL", "MySQL", "MongoDB", "None"];
const caches = ["Redis", "None"];
const queues = ["RabbitMQ", "None"];

type GenerateResponse = {
  project: { name: string; slug: string; url: string };
  stackSummary: string;
  readme: string;
  files: { path: string; content: string }[];
  generationLogs: string[];
};

export default function QuickStartPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("goneops-demo");
  const [stack, setStack] = useState("NestJS");
  const [database, setDatabase] = useState("PostgreSQL");
  const [cache, setCache] = useState("Redis");
  const [queue, setQueue] = useState("RabbitMQ");
  const [includeReadme, setIncludeReadme] = useState(true);
  const [includeDockerCompose, setIncludeDockerCompose] = useState(true);
  const [includeCi, setIncludeCi] = useState(true);
  const [includeHelloWorld, setIncludeHelloWorld] = useState(true);
  const [status, setStatus] = useState("Ready to generate");
  const [result, setResult] = useState<GenerateResponse | null>(null);

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
    localStorage.setItem(`quickstart:${generated.project.slug}`, JSON.stringify(generated));
    setResult(generated);
    setStatus(`Generated ${generated.project.slug}`);
    router.push(generated.project.url);
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#111111]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between border-b border-[#eaeaea] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-xs font-bold text-white">GO</div>
            <div>
              <div className="font-semibold">GoneOps QuickStart Edition</div>
              <div className="text-xs text-[#666666]">One Click Project Bootstrap</div>
            </div>
          </div>
          <Link className="rounded-full border border-[#dddddd] px-3 py-1 text-xs text-[#666666]" href="/">
            Advanced workspace
          </Link>
        </nav>

        <div className="grid gap-8 py-10 lg:grid-cols-[1fr_420px]">
          <section className="rounded-[28px] border border-[#e5e5e5] bg-white p-6 shadow-2xl shadow-black/5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#777]">Create Project</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Generate a runnable local project.</h1>
            <p className="mt-3 text-sm leading-6 text-[#666]">This is now wired to the QuickStart backend API. Click generate to create project files, then open a project URL that renders the generated README.</p>

            <label className="mt-8 block text-sm font-semibold" htmlFor="quickstart-project-name">Project Name:</label>
            <input id="quickstart-project-name" className="mt-2 w-full rounded-xl border border-[#dddddd] px-4 py-3 font-mono text-sm outline-none focus:border-black" value={projectName} onChange={(event) => setProjectName(event.target.value)} />

            <RadioGroup title="Stack:" items={stacks} selected={stack} onSelect={setStack} />
            <RadioGroup title="Database:" items={databases} selected={database} onSelect={setDatabase} />
            <RadioGroup title="Cache:" items={caches} selected={cache} onSelect={setCache} />
            <RadioGroup title="Queue:" items={queues} selected={queue} onSelect={setQueue} />

            <div className="mt-6 grid gap-3 rounded-2xl border border-[#eeeeee] bg-[#fbfbfb] p-4">
              <Checkbox label="Generate README" checked={includeReadme} onChange={setIncludeReadme} />
              <Checkbox label="Generate Docker Compose" checked={includeDockerCompose} onChange={setIncludeDockerCompose} />
              <Checkbox label="Generate CI/CD" checked={includeCi} onChange={setIncludeCi} />
              <Checkbox label="Generate Hello World" checked={includeHelloWorld} onChange={setIncludeHelloWorld} />
            </div>

            <button className="mt-6 w-full rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5" onClick={generateProject} type="button">
              Generate Project
            </button>
          </section>

          <aside className="rounded-[28px] border border-[#e5e5e5] bg-white p-5 shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Manual Result</div>
                <div className="text-xs text-[#666666]">{stack} + {database} + {cache} + {queue}</div>
              </div>
              <div className="rounded-full bg-[#f5f5f5] px-3 py-1 text-xs text-[#666666]">{status}</div>
            </div>

            <div className="mt-5 rounded-2xl bg-[#050505] p-4 font-mono text-xs leading-6 text-[#ededed]">
              <div>POST {apiBase}/quickstart/generate</div>
              <div>Project URL: /quickstart/projects/goneops-demo</div>
              <div>README preview after generation</div>
            </div>

            {result ? (
              <div className="mt-5 grid gap-3 text-sm">
                <Link className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-800" href={result.project.url}>
                  Open generated project: {result.project.slug}
                </Link>
                <div className="text-xs text-[#666]">{result.stackSummary}</div>
                {result.generationLogs.map((log) => <div key={log} className="font-mono text-xs">{log}</div>)}
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
