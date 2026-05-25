"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const frontends = ["NextJS", "React", "Vue", "Static HTML"];
const backends = ["Go Fiber", "NestJS", "ExpressJS", "FastAPI"];
const databases = ["PostgreSQL", "MySQL", "MongoDB"];
const infrastructure = ["Redis", "RabbitMQ", "MinIO"];
const generatedFiles = ["README.md", "docker-compose.yml", ".env.example", "Makefile", "openapi.yaml", "backend/Dockerfile", "frontend/Dockerfile", "database/seed.sql", "scripts/healthcheck.sh"];
const generationLogs = [
  "[✓] Generate backend",
  "[✓] Generate Swagger",
  "[✓] Generate PostgreSQL config",
  "[✓] Generate Redis config",
  "[✓] Generate RabbitMQ workflow",
  "[✓] Generate Docker Compose",
  "[✓] Build containers",
  "[✓] Run health checks",
  "[✓] Validate API",
  "[✓] Validate Swagger"
];
const resultItems = [
  "Project Name",
  "Stack Summary",
  "Generated Services",
  "Container Status",
  "Ports",
  "URLs",
  "Credentials",
  "Swagger URL",
  "API Examples",
  "Docker Commands"
];

export default function QuickStartPage() {
  const [frontend, setFrontend] = useState(frontends[0]);
  const [backend, setBackend] = useState(backends[0]);
  const [database, setDatabase] = useState(databases[0]);
  const [infra, setInfra] = useState(["Redis", "RabbitMQ"]);
  const [generated, setGenerated] = useState(false);
  const stackSummary = useMemo(() => `${frontend} + ${backend} + ${database} + ${infra.join(" + ")}`, [frontend, backend, database, infra]);

  const toggleInfra = (item: string) => {
    setInfra((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]));
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#111111]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-8 sm:px-8 lg:px-10">
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

        <div className="grid flex-1 gap-8 py-10 lg:grid-cols-[1fr_460px]">
          <section>
            <div className="inline-flex rounded-full border border-[#e5e5e5] bg-white px-3 py-1 text-xs text-[#666666] shadow-sm">
              Vercel/Railway inspired • Real runnable projects • Docker Compose first
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Select stack. Click generate. Run locally.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#666666]">
              Generate actual working codebases with Swagger/OpenAPI, seeded demo data, health checks, API examples, Docker Compose networking, and local startup validation.
            </p>

            <div className="mt-8 grid gap-5">
              <StackGroup title="Frontend" items={frontends} selected={frontend} onSelect={setFrontend} />
              <StackGroup title="Backend" items={backends} selected={backend} onSelect={setBackend} />
              <StackGroup title="Database" items={databases} selected={database} onSelect={setDatabase} />
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#777]">Infrastructure</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {infrastructure.map((item) => (
                    <button
                      key={item}
                      className={`rounded-2xl border p-4 text-left text-sm transition ${infra.includes(item) ? "border-black bg-white shadow-lg shadow-black/5" : "border-[#e5e5e5] bg-white/70 hover:bg-white"}`}
                      onClick={() => toggleInfra(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
              onClick={() => setGenerated(true)}
              type="button"
            >
              Generate Real Runnable Project
            </button>
          </section>

          <aside className="rounded-[28px] border border-[#e5e5e5] bg-white p-5 shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Generation Result</div>
                <div className="text-xs text-[#666666]">{stackSummary}</div>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs ${generated ? "bg-emerald-50 text-emerald-700" : "bg-[#f5f5f5] text-[#666666]"}`}>
                {generated ? "Runnable" : "Waiting"}
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-[#050505] p-4 font-mono text-xs leading-6 text-[#ededed]">
              <div>cp .env.example .env</div>
              <div>docker compose up --build</div>
              <div>curl http://localhost:${"${API_APP_PORT}"}/health</div>
              <div>open http://localhost:${"${API_APP_PORT}"}/swagger</div>
              <div>curl -X POST http://localhost:${"${API_APP_PORT}"}/jobs</div>
            </div>

            <div className="mt-5 grid gap-2">
              {generationLogs.map((log) => (
                <div key={log} className="rounded-xl border border-[#eeeeee] px-3 py-2 font-mono text-xs text-[#333333]">{log}</div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <ResultPanel title="Output" items={resultItems} />
              <ResultPanel title="Files" items={generatedFiles} />
            </div>

            <div className="mt-5 rounded-2xl border border-[#eeeeee] bg-[#fbfbfb] p-4 text-xs leading-6 text-[#555]">
              <div className="font-semibold text-[#111]">Example credentials and URLs</div>
              <div>Frontend: http://localhost:${"${FRONTEND_APP_PORT}"}</div>
              <div>Backend API: http://localhost:${"${API_APP_PORT}"}</div>
              <div>Swagger: http://localhost:${"${API_APP_PORT}"}/swagger</div>
              <div>PostgreSQL: host=postgres port=5432 user=appuser password=apppassword database=appdb</div>
              <div>Redis: redis://redis:6379</div>
              <div>RabbitMQ: http://localhost:${"${RABBITMQ_UI_APP_PORT}"} user=guest password=guest</div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function StackGroup({ title, items, selected, onSelect }: { title: string; items: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#777]">{title}</div>
      <div className="grid gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <button
            key={item}
            className={`rounded-2xl border p-4 text-left text-sm transition ${selected === item ? "border-black bg-white shadow-lg shadow-black/5" : "border-[#e5e5e5] bg-white/70 hover:bg-white"}`}
            onClick={() => onSelect(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-[#666666]">{title}</div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-xl border border-[#eeeeee] px-3 py-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {item}
          </div>
        ))}
      </div>
    </div>
  );
}
