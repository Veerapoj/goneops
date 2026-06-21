import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchServices, createService } from '../api/client';
import {
  Server, Loader2, AlertCircle, Circle, RefreshCw, Plus, X, CheckCircle2, Globe, Database, Box, MessageSquare,
} from 'lucide-react';

const SERVICE_TYPES = [
  { type: 'runtime', label: 'Web Service', icon: Globe, color: 'text-blue-600' },
  { type: 'database', label: 'Database', icon: Database, color: 'text-sky-600' },
  { type: 'cache', label: 'Cache', icon: Box, color: 'text-red-500' },
  { type: 'queue', label: 'Message Queue', icon: MessageSquare, color: 'text-orange-500' },
];

function AddServiceForm({ projectId, environmentId, onCreated }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('runtime');
  const [port, setPort] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createService(projectId, environmentId, name.trim(), type, parseInt(port) || 0);
      setName(''); setPort(''); setShow(false);
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button onClick={() => setShow(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm">
        <Plus size={16} /> Add Service
      </button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShow(false)}>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">Add Service</h2>
              <button type="button" onClick={() => setShow(false)}><X size={16} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <input autoFocus type="text" placeholder="Service name (e.g. my-api)" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400">
              {SERVICE_TYPES.map((st) => <option key={st.type} value={st.type}>{st.label}</option>)}
            </select>
            <input type="number" placeholder="Port (e.g. 8080)" value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            {error && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle size={14} /> {error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving || !name.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {saving ? 'Creating…' : 'Create'}
              </button>
              <button type="button" onClick={() => setShow(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

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
      healthy: 'bg-emerald-50 text-emerald-700',
      unhealthy: 'bg-red-50 text-red-700',
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
        <div className="flex items-center gap-2">
          {selectedProjectId && selectedEnvironmentId && (
            <AddServiceForm projectId={selectedProjectId} environmentId={selectedEnvironmentId} onCreated={load} />
          )}
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
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
          <p className="font-medium">No services yet</p>
          <p className="text-sm">Add a service or generate a sandbox to create one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Service</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Type</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Port</th>
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
                  <td className="px-6 py-4 text-slate-500 text-xs capitalize">{svc.type || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(svc.status)}`}>
                      <Circle size={6} className="fill-current" />
                      {svc.status || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-mono">{svc.port || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
