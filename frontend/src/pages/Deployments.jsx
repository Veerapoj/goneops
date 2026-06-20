import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchDeployments } from '../api/client';
import {
  Rocket, Loader2, AlertCircle, CheckCircle2, XCircle, Clock, RefreshCw, Circle,
} from 'lucide-react';

export default function Deployments() {
  const { selectedProjectId, selectedEnvironmentId } = useProject();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeployments(selectedProjectId, selectedEnvironmentId);
      setDeployments(Array.isArray(data) ? data : (data.deployments || []));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedProjectId, selectedEnvironmentId]);

  const statusIcon = (status) => {
    const s = status?.toLowerCase();
    if (s === 'success') return <CheckCircle2 size={16} className="text-emerald-500" />;
    if (s === 'failed') return <XCircle size={16} className="text-red-500" />;
    if (s === 'running') return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    return <Clock size={16} className="text-slate-400" />;
  };

  const statusBadge = (status) => {
    const map = {
      success: 'bg-emerald-50 text-emerald-700',
      failed: 'bg-red-50 text-red-700',
      running: 'bg-blue-50 text-blue-700',
      pending: 'bg-amber-50 text-amber-700',
    };
    return map[status?.toLowerCase()] || 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Deployments</h1>
          <p className="text-slate-500 text-sm mt-1">Deployment history for the selected environment.</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {!selectedEnvironmentId ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Rocket size={32} />
          <p className="font-medium">Select an environment to view deployments</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} /> {error}
        </div>
      ) : deployments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Rocket size={32} />
          <p className="font-medium">No deployments yet</p>
          <p className="text-sm">Run a pipeline to create deployments.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Deployment</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Environment</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Commit</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Triggered by</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d, i) => (
                <tr key={d.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {statusIcon(d.status)}
                      <span className="font-medium text-slate-700">{d.name || `Deploy #${i + 1}`}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(d.status)}`}>
                      {d.status || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{d.environment || '—'}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-mono">{d.commit?.slice(0, 7) || '—'}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{d.triggered_by || d.author || '—'}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
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
