import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchServices } from '../api/client';
import { Server, Loader2, AlertCircle, Circle, RefreshCw } from 'lucide-react';

export default function Services() {
  const { selectedProjectId, selectedEnvironmentId } = useProject();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchServices(selectedProjectId, selectedEnvironmentId);
      setServices(Array.isArray(data) ? data : (data.services || []));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedProjectId, selectedEnvironmentId]);

  const statusBadge = (status) => {
    const styles = {
      running: 'bg-emerald-50 text-emerald-700',
      stopped: 'bg-slate-100 text-slate-600',
      error: 'bg-red-50 text-red-700',
      pending: 'bg-amber-50 text-amber-700',
    };
    return styles[status?.toLowerCase()] || 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Services</h1>
          <p className="text-slate-500 text-sm mt-1">Running containers and microservices in this environment.</p>
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
          <Server size={32} />
          <p className="font-medium">Select an environment first</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} /> {error}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Server size={32} />
          <p className="font-medium">No services running</p>
          <p className="text-sm">Start the sandbox to see services here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Service</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Image</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Ports</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">CPU</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Memory</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc, i) => (
                <tr key={svc.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <Server size={15} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700">{svc.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(svc.status)}`}>
                      <Circle size={6} className="fill-current" />
                      {svc.status || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{svc.image || '—'}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {svc.ports?.join(', ') || svc.port || '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{svc.cpu || '—'}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{svc.memory || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
