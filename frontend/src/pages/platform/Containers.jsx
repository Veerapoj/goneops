import { useState, useEffect, useCallback } from 'react';
import { Box, AlertTriangle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { fetchContainers } from '../../api/client';

export default function Containers() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContainers();
      setContainers(data);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={28} className="text-red-400" />
        <p className="text-slate-600 text-sm">{error}</p>
        <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Containers</h1>
        <p className="text-sm text-slate-500 mt-1">Container inventory across all hosts</p>
      </div>

      {containers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Box size={28} className="text-slate-300" />
          <p className="text-slate-500 text-sm">No containers discovered yet.</p>
          <p className="text-slate-400 text-xs">Run discovery jobs to populate container inventory.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Image</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Host</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPU</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Memory</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ports</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-slate-800">{c.name}</span>
                    <span className="block text-xs text-slate-400 font-mono mt-0.5">{c.container_id ? c.container_id.slice(0, 12) : '-'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-600">{c.image || '-'}</span>
                    {c.image_tag && <span className="text-xs text-slate-400 ml-1">:{c.image_tag}</span>}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{c.host_name || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{c.provider_name || '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{c.cpu_usage_pct > 0 ? `${c.cpu_usage_pct}%` : '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{c.memory_usage_mb > 0 ? `${c.memory_usage_mb} MB` : '-'}</td>
                  <td className="py-3 px-4 text-sm text-slate-500">
                    {c.ports && Array.isArray(c.ports) && c.ports.length > 0
                      ? c.ports.slice(0, 2).map((p, i) => (
                          <span key={i} className="inline-block px-1.5 py-0.5 mr-1 rounded bg-indigo-50 text-indigo-600 text-xs font-mono">
                            {p.host}:{p.container}
                          </span>
                        ))
                      : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      c.status === 'running' ? 'text-emerald-600' :
                      c.status === 'stopped' ? 'text-slate-500' :
                      c.status === 'error' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        c.status === 'running' ? 'bg-emerald-400' :
                        c.status === 'stopped' ? 'bg-slate-400' :
                        c.status === 'error' ? 'bg-red-400' : 'bg-amber-400'
                      }`} />
                      {c.status || 'unknown'}
                    </span>
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
