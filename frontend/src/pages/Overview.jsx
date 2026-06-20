import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { fetchProject, testApi } from '../api/client';
import {
  LayoutDashboard, ExternalLink, Copy, Globe2, Database as DatabaseIcon,
  Box, MessageSquare, HardDrive, Layers3, Activity, Cloud,
  FileCode2, Terminal, KeyRound, MoreHorizontal,
  Check, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle,
  Server, Zap, Upload, Loader2, GitBranch, Rocket,
} from 'lucide-react';

const SERVICE_TYPES = [
  { key: 'web', label: 'Web Service', icon: Globe2, desc: 'HTTP/HTTPS server' },
  { key: 'database', label: 'Database', icon: DatabaseIcon, desc: 'PostgreSQL / MySQL' },
  { key: 'redis', label: 'Redis', icon: Zap, desc: 'In-memory cache' },
  { key: 'queue', label: 'Message Queue', icon: MessageSquare, desc: 'RabbitMQ / Kafka' },
  { key: 'storage', label: 'Storage', icon: HardDrive, desc: 'S3-compatible' },
  { key: 'other', label: 'Other', icon: Layers3, desc: 'Custom service' },
];

const PIPELINE_STEPS = ['Checkout', 'Install', 'Lint & Test', 'Build', 'Deploy', 'Smoke Test'];

function statusBadge(status) {
  switch (status) {
    case 'running': case 'healthy': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'stopped': case 'unhealthy': return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'error': case 'failed': return 'bg-red-50 text-red-600 border-red-200';
    case 'building': case 'pending': case 'starting': case 'restarting': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'success': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-slate-100 text-slate-500 border-slate-200';
  }
}

function statusDot(status) {
  switch (status) {
    case 'running': case 'success': case 'healthy': return 'bg-emerald-400';
    case 'failed': case 'error': return 'bg-red-400';
    case 'building': case 'pending': case 'starting': case 'restarting': return 'bg-amber-400';
    default: return 'bg-slate-300';
  }
}

function stepColors(status) {
  switch (status) {
    case 'success': return { ring: 'border-emerald-400 bg-emerald-50', text: 'text-emerald-600', line: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'running': return { ring: 'border-amber-400 bg-amber-50', text: 'text-amber-600', line: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'failed': return { ring: 'border-red-400 bg-red-50', text: 'text-red-600', line: 'bg-red-400', badge: 'bg-red-50 text-red-600 border-red-200' };
    default: return { ring: 'border-slate-200 bg-slate-50', text: 'text-slate-400', line: 'bg-slate-200', badge: 'bg-slate-100 text-slate-400 border-slate-200' };
  }
}

function ServiceIcon({ type }) {
  const t = (type || '').toLowerCase();
  if (t.includes('database') || t.includes('postgres') || t.includes('mysql')) return <DatabaseIcon size={13} />;
  if (t.includes('redis')) return <Zap size={13} />;
  if (t.includes('queue') || t.includes('rabbit')) return <MessageSquare size={13} />;
  if (t.includes('web') || t.includes('http') || t.includes('runtime')) return <Globe2 size={13} />;
  return <Server size={13} />;
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="p-1 hover:text-blue-600 text-slate-400 transition-colors rounded">
      {done ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

export default function Overview() {
  const { selectedProjectId, selectedEnvironmentId, selectedProject, loading: ctxLoading, refresh } = useProject();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const load = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const p = await fetchProject(selectedProjectId);
      setProject(p);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => { load(); }, [load]);

  const handleTest = async () => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const r = await testApi(selectedProjectId, selectedEnvironmentId);
      setTestResult({ ok: true, data: r });
    } catch (e) {
      setTestResult({ ok: false, msg: e?.response?.data?.error || e.message });
    } finally {
      setTestLoading(false);
    }
  };

  const isLoading = ctxLoading || loading;
  const data = project || selectedProject || {};
  const environments = data.environments || [];
  const services = data.services || [];
  const activeEnv = environments.find(e => e.id === selectedEnvironmentId) || environments[0] || null;
  const previewUrl = activeEnv?.preview_url || '';
  const envStatus = activeEnv?.status || 'stopped';
  const pipelineRun = data.last_pipeline;
  const steps = PIPELINE_STEPS.map((name, i) => ({
    name,
    status: pipelineRun?.steps?.[i]?.status || 'pending',
    duration: pipelineRun?.steps?.[i]?.duration_ms ? `${Math.round(pipelineRun.steps[i].duration_ms / 1000)}s` : '--',
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <AlertCircle size={18} className="shrink-0" />
        <span className="text-sm">{error}</span>
        <button onClick={load} className="ml-auto text-xs underline hover:no-underline">Retry</button>
      </div>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Activity size={36} />
        <p className="text-lg font-medium text-slate-600">No project selected</p>
        <p className="text-sm">Create or select a project to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard size={18} className="text-blue-500" />
            <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
          </div>
          <p className="text-sm text-slate-500">Monitor and manage your active deployment environment</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusBadge(envStatus)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot(envStatus)} ${envStatus === 'running' ? 'animate-pulse' : ''}`} />
            {envStatus.charAt(0).toUpperCase() + envStatus.slice(1)}
          </span>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs text-white font-medium transition-colors">
              <ExternalLink size={12} /> Open App
            </a>
          )}
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 soft-shadow">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Environment</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-slate-800 truncate">{activeEnv?.name || 'No Environment'}</span>
            {activeEnv && (
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${statusBadge(envStatus)}`}>{envStatus}</span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">{activeEnv?.working_dir || 'Not provisioned'}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 soft-shadow">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Status</p>
          <div className="flex items-center gap-2 mb-1">
            {envStatus === 'running' ? <CheckCircle2 size={18} className="text-emerald-500" /> :
              envStatus === 'error' || envStatus === 'failed' ? <XCircle size={18} className="text-red-500" /> :
              <Clock size={18} className="text-slate-400" />}
            <span className="text-lg font-bold text-slate-800 capitalize">{envStatus}</span>
          </div>
          <p className="text-xs text-slate-400">
            {pipelineRun ? `Last pipeline: ${new Date(pipelineRun.created_at).toLocaleString()}` : 'No pipeline runs yet'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 soft-shadow">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Preview URL</p>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-blue-600 truncate flex-1">{previewUrl || 'Not available'}</span>
            {previewUrl && <CopyBtn text={previewUrl} />}
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="p-1 hover:text-blue-600 text-slate-400">
                <ExternalLink size={12} />
              </a>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{data.name || '—'}</p>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left (wider) */}
        <div className="col-span-3 space-y-6">

          {/* Service types */}
          <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Service Types</h2>
            <div className="grid grid-cols-3 gap-3">
              {SERVICE_TYPES.map((st) => {
                const Icon = st.icon;
                const active = services.some(s => (s.type || '').toLowerCase().includes(st.key));
                return (
                  <div key={st.key}
                    className={`relative flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-all
                      ${active ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                    {active && <span className="absolute top-2 right-2"><Check size={10} className="text-blue-500" /></span>}
                    <Icon size={16} className={active ? 'text-blue-500' : 'text-slate-400'} />
                    <span className={`text-xs font-medium ${active ? 'text-blue-700' : 'text-slate-600'}`}>{st.label}</span>
                    <span className="text-[10px] text-slate-400">{st.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Runtime services table */}
          <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Runtime Services</h2>
              <span className="text-xs text-slate-400">{services.length} services</span>
            </div>
            {services.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">
                No services configured. Generate a sandbox to provision services.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="text-left px-5 py-3 text-xs text-slate-500 font-medium">Service</th>
                    <th className="text-left px-3 py-3 text-xs text-slate-500 font-medium">Type</th>
                    <th className="text-left px-3 py-3 text-xs text-slate-500 font-medium">Status</th>
                    <th className="text-left px-3 py-3 text-xs text-slate-500 font-medium">Resource</th>
                    <th className="px-3 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {services.map((svc) => (
                    <tr key={svc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                            <ServiceIcon type={svc.type} />
                          </div>
                          <span className="text-slate-700 font-medium text-xs">{svc.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-slate-500 capitalize">{svc.type || '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(svc.status || 'stopped')}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot(svc.status)} ${svc.status === 'running' ? 'animate-pulse' : ''}`} />
                          {svc.status || 'stopped'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-slate-400">{svc.port ? `Port ${svc.port}` : '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="relative">
                          <button onClick={() => setOpenMenu(openMenu === svc.id ? null : svc.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                            <MoreHorizontal size={14} />
                          </button>
                          {openMenu === svc.id && (
                            <div className="absolute right-0 top-7 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
                              <Link to="/logs" className="block w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">View Logs</Link>
                              <Link to="/services" className="block w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">Configure</Link>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* CI/CD Pipeline */}
          <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-700">CI/CD Pipeline</h2>
              <div className="flex items-center gap-2">
                {pipelineRun && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(pipelineRun.status)}`}>
                    {pipelineRun.status}
                  </span>
                )}
                <Link to="/pipelines" className="text-xs text-blue-600 hover:text-blue-700">View all →</Link>
              </div>
            </div>

            <div className="flex items-start gap-0">
              {steps.map((step, i) => {
                const c = stepColors(step.status);
                return (
                  <div key={step.name} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-semibold ${c.ring} ${c.text}`}>
                        {step.status === 'success' ? <Check size={13} /> :
                          step.status === 'running' ? <Loader2 size={13} className="animate-spin" /> : i + 1}
                      </div>
                      <span className="text-[10px] text-slate-500 truncate w-full text-center leading-tight">{step.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${c.badge}`}>{step.duration}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`h-0.5 w-full max-w-6 ${c.line} mx-0.5 mt-[-22px]`} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-3 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <GitBranch size={12} className="text-slate-400 shrink-0" />
              {pipelineRun ? (
                <>
                  <span className="text-slate-500">Latest Pipeline</span>
                  <span className="font-mono text-slate-700">#{pipelineRun.id}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">{new Date(pipelineRun.created_at).toLocaleString()}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">{pipelineRun.duration_ms ? `${Math.round(pipelineRun.duration_ms / 1000)}s` : 'N/A'}</span>
                </>
              ) : (
                <span className="text-slate-400">No pipeline runs yet. <Link to="/pipelines" className="text-blue-600 hover:underline">Run one →</Link></span>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-5">
          {/* Live App */}
          <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Globe2 size={13} className="text-blue-500" />
                <span className="text-xs font-semibold text-slate-700">Live App</span>
              </div>
              {previewUrl && (
                <button onClick={handleTest} disabled={testLoading}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs text-blue-600 font-medium transition-colors disabled:opacity-50">
                  {testLoading ? <Loader2 size={10} className="animate-spin" /> : <Activity size={10} />}
                  Test API
                </button>
              )}
            </div>
            <div className="border-t border-slate-200 overflow-hidden">
              <div className="h-7 bg-slate-900 flex items-center gap-1.5 px-3">
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="ml-2 text-[9px] text-slate-400 font-mono truncate">{previewUrl || 'not available'}</span>
              </div>
              <div className="h-[200px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 text-center p-4">
                <div>
                  <div className="text-lg font-bold text-slate-800">Welcome to</div>
                  <div className="text-2xl font-black text-blue-600">{data.name || 'GoneOps'}</div>
                  <p className="text-xs text-slate-500 mt-2">This is your sandbox environment.</p>
                  {previewUrl ? (
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-block mt-4 bg-blue-600 text-white rounded-lg px-4 py-2 text-xs font-bold hover:bg-blue-700 transition-colors">
                      Open in New Tab ↗
                    </a>
                  ) : (
                    <p className="text-xs text-slate-400 mt-4">Not running</p>
                  )}
                  {testResult && (
                    <div className="mt-3 text-left">
                      <pre className={`text-[10px] p-2 rounded-lg max-h-24 overflow-auto ${
                        testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {JSON.stringify(testResult.data || testResult.msg, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* README */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 soft-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">README</span>
              <Link to="/files" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View files</Link>
            </div>
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-slate-700">This project was created by GoneOps Sandbox</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Node.js + Express for Web API</li>
                <li>PostgreSQL: <span className="font-mono font-medium">{activeEnv?.working_dir ? `${data.name}_${activeEnv.name}_db` : 'N/A'}</span></li>
                <li>Redis for cache</li>
                <li>RabbitMQ for message queue</li>
              </ul>
              <pre className="bg-slate-100 rounded-lg p-2.5 text-[10px] text-slate-700">docker compose up -d</pre>
              <p className="text-[10px] text-slate-400">Generated by GoneOps MVP</p>
            </div>
          </div>

          {/* Project Info + Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 soft-shadow">
              <span className="text-sm font-semibold text-slate-700 block mb-3">Project Info</span>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Project</span>
                  <span className="font-medium text-slate-700 truncate ml-2">{data.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID</span>
                  <span className="font-mono text-slate-600 truncate ml-2">{data.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-600">{data.created_at ? new Date(data.created_at).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 soft-shadow">
              <span className="text-sm font-semibold text-slate-700 block mb-3">Quick Actions</span>
              <div className="space-y-2 text-xs font-medium">
                <Link to="/files" className="flex items-center gap-2 border rounded-lg p-2.5 hover:bg-slate-50 text-slate-600 transition-colors">
                  <FileCode2 size={13} /> File Browser
                </Link>
                <Link to="/logs" className="flex items-center gap-2 border rounded-lg p-2.5 hover:bg-slate-50 text-slate-600 transition-colors">
                  <Terminal size={13} /> View Logs
                </Link>
                <Link to="/secrets" className="flex items-center gap-2 border rounded-lg p-2.5 hover:bg-slate-50 text-slate-600 transition-colors">
                  <KeyRound size={13} /> Secrets
                </Link>
                <Link to="/pipelines" className="flex items-center gap-2 border rounded-lg p-2.5 hover:bg-slate-50 text-slate-600 transition-colors">
                  <Rocket size={13} /> Run Pipeline
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
