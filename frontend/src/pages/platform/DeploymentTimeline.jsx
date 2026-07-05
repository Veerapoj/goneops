import { useState, useEffect, useCallback } from 'react';
import { Rocket, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Box } from 'lucide-react';
import { fetchProjects, fetchDeployments } from '../../api/client';

function StatusBadge({ status }) {
  const map = {
    success: 'bg-emerald-50 text-emerald-700',
    running: 'bg-blue-50 text-blue-700',
    failed: 'bg-red-50 text-red-700',
    pending: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map[status?.toLowerCase()] || 'bg-slate-100 text-slate-500'}`}>
      {status || 'unknown'}
    </span>
  );
}

function RuntimeTrace({ runtime }) {
  const [open, setOpen] = useState(false);
  if (!runtime || (Object.keys(runtime).length === 0)) {
    return <span className="text-xs text-slate-400">No runtime data</span>;
  }
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Runtime Details
      </button>
      {open && (
        <div className="mt-2 ml-2 p-2 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-100">
          {runtime.container && (
            <div className="text-slate-600">
              <span className="font-medium text-slate-700">Container:</span> {runtime.container.name}
              {runtime.container.status && (
                <span className={`ml-1.5 inline-flex items-center gap-0.5 ${
                  runtime.container.status === 'running' ? 'text-emerald-600' : 'text-slate-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    runtime.container.status === 'running' ? 'bg-emerald-400' : 'bg-slate-400'
                  }`} />
                  {runtime.container.status}
                </span>
              )}
            </div>
          )}
          {runtime.container?.image && (
            <div className="text-slate-500">Image: {runtime.container.image}</div>
          )}
          {runtime.vm && (
            <div className="text-slate-600">
              <span className="font-medium text-slate-700">VM:</span> {runtime.vm.name} (vmid: {runtime.vm.vmid})
              <span className={`ml-1.5 ${runtime.vm.status === 'running' ? 'text-emerald-600' : 'text-slate-500'}`}>
                ({runtime.vm.status})
              </span>
            </div>
          )}
          {runtime.host && (
            <div className="text-slate-600">
              <span className="font-medium text-slate-700">Host:</span> {runtime.host.hostname}
              {runtime.host.ip && <span className="text-slate-400"> ({runtime.host.ip})</span>}
            </div>
          )}
          {runtime.provider && (
            <div className="text-slate-600">
              <span className="font-medium text-slate-700">Provider:</span> {runtime.provider.name} ({runtime.provider.type})
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeploymentTimeline() {
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await fetchProjects();
        setProjects(Array.isArray(data) ? data : data.projects || []);
      } catch (e) {
        console.error('Failed to load projects', e);
      } finally {
        setProjectsLoading(false);
      }
    }
    loadProjects();
  }, []);

  const loadDeployments = useCallback(async (pid) => {
    if (!pid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeployments(pid);
      setDeployments(data?.deployments || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
      setDeployments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) loadDeployments(projectId);
  }, [projectId, loadDeployments]);

  const statusIcon = (status) => {
    const s = status?.toLowerCase();
    if (s === 'success') return <CheckCircle2 size={16} className="text-emerald-500" />;
    if (s === 'failed') return <XCircle size={16} className="text-red-500" />;
    if (s === 'running') return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    return <Clock size={16} className="text-slate-400" />;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Deployment Timeline</h1>
        <p className="text-sm text-slate-500 mt-1">Deployment history with runtime infrastructure traceability</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 min-w-[220px]"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {projectId && (
            <button
              onClick={() => loadDeployments(projectId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {!projectId ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Rocket size={32} />
          <p className="font-medium">Select a project to view its deployment timeline</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="text-slate-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      ) : deployments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Rocket size={32} />
          <p className="font-medium">No deployments yet for this project</p>
          <p className="text-sm">Run a pipeline to create deployments.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Image</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Env ID</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Runtime Trace</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Deployed At</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d, i) => (
                <tr key={d.id || i} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {statusIcon(d.status)}
                      <span className="font-medium text-slate-700">{d.version || `#${i + 1}`}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={d.status} /></td>
                  <td className="py-3 px-4">
                    <span className="text-slate-600 font-mono text-xs">{d.image || '—'}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{d.environment_id || '—'}</td>
                  <td className="py-3 px-4">
                    <RuntimeTrace runtime={d.runtime} />
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
