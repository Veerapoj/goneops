"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const stacks = [
  {
    id: "node-http",
    label: "Node HTTP API",
    description: "Zero-dependency native Node.js hello world endpoint."
  },
  {
    id: "node-service",
    label: "Node Service API",
    description: "Clean local service skeleton for internal tools."
  },
  {
    id: "node-worker-api",
    label: "Node Worker API",
    description: "Lightweight worker-friendly API with a hello endpoint."
  }
];

const generatedFiles = ["README.md", "package.json", ".env.example", "src/server.js", "Dockerfile", "docker-compose.yml"];
const validationChecks = ["Builds successfully", "Runs locally", "Docker Compose supported", "Hello World endpoint", "Ports from .env"];

export default function QuickStartPage() {
  const [stack, setStack] = useState(stacks[0].id);
  const [generated, setGenerated] = useState(false);
  const selected = useMemo(() => stacks.find((item) => item.id === stack) ?? stacks[0], [stack]);

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

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1fr_420px]">
          <section>
            <div className="inline-flex rounded-full border border-[#e5e5e5] bg-white px-3 py-1 text-xs text-[#666666] shadow-sm">
              Simple • Reliable • Fast • Lightweight
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Select stack. Click generate. Run locally.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#666666]">
              A separate QuickStart flow for generating a clean runnable local project with Docker Compose, README, .env.example, and a Hello World endpoint.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {stacks.map((item) => (
                <button
                  key={item.id}
                  className={`rounded-2xl border p-4 text-left transition ${
                    stack === item.id ? "border-black bg-white shadow-lg shadow-black/5" : "border-[#e5e5e5] bg-white/70 hover:bg-white"
                  }`}
                  onClick={() => setStack(item.id)}
                  type="button"
                >
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="mt-2 text-xs leading-5 text-[#666666]">{item.description}</div>
                </button>
              ))}
            </div>

            <button
              className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
              onClick={() => setGenerated(true)}
              type="button"
            >
              Generate QuickStart Project
            </button>
          </section>

          <aside className="rounded-[28px] border border-[#e5e5e5] bg-white p-5 shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Generation Result</div>
                <div className="text-xs text-[#666666]">{selected.label}</div>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs ${generated ? "bg-emerald-50 text-emerald-700" : "bg-[#f5f5f5] text-[#666666]"}`}>
                {generated ? "Ready" : "Waiting"}
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-[#050505] p-4 font-mono text-xs leading-6 text-[#ededed]">
              <div>cp .env.example .env</div>
              <div>npm install</div>
              <div>npm run build</div>
              <div>npm start</div>
              <div>curl http://localhost:$PORT/hello</div>
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Generated files</div>
              <div className="mt-3 grid gap-2">
                {generatedFiles.map((file) => (
                  <div key={file} className="flex items-center justify-between rounded-xl border border-[#eeeeee] px-3 py-2 text-sm">
                    <span className="font-mono text-xs">{file}</span>
                    <span className="text-xs text-[#666666]">included</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {validationChecks.map((check) => (
                <div key={check} className="flex items-center gap-2 text-sm text-[#333333]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> {check}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
