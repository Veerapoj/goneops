import { useState, useEffect, useCallback } from 'react';
import { Search, Link2, Check, AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';
import { fetchUnmappedContainers, fetchContainers, fetchApplications, fetchServices, linkContainer, fetchProject } from '../../api/client';

function Badge({ status }) {
  const colors = {
    running: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    stopped: 'bg-slate-50 text-slate-500 border-slate-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    unknown: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${colors[status] || colors.unknown}`}>
      {status || 'unknown'}
    </span>
  );
}

export default function UnmappedAssets() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showLinker, setShowLinker] = useState(null);
  const [applications, setApplications] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ application_id: '', environment_id: '', service_id: '' });
  const [linking, setLinking] = useState(false);
  const [result, setResult] = useState(null);

  const loadContainers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUnmappedContainers();
      const unmapped = Array.isArray(data)
        ? data.filter((c) => !c.application_id && c.data_source === 'discovered')
        : [];
      setContainers(unmapped);
    } catch (e) {
      try {
        const all = await fetchContainers();
        const unmapped = Array.isArray(all)
          ? all.filter((c) => !c.application_id && c.data_source === 'discovered')
          : [];
        setContainers(unmapped);
      } catch (e2) {
        setError(e2.response?.data?.error?.message || e2.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContainers(); }, [loadContainers]);

  async function openLinker(container) {
    setShowLinker(container);
    setForm({ application_id: '', environment_id: '', service_id: '' });
    setServices([]);
    setEnvironments([]);
    setResult(null);
    try {
      const apps = await fetchApplications();
      setApplications(apps);
    } catch (e) { /* ignore */ }
  }

  async function handleApplicationChange(appId) {
    setForm((prev) => ({ ...prev, application_id: appId, environment_id: '', service_id: '' }));
    setEnvironments([]);
    setServices([]);
    if (!appId) return;
    try {
      const app = applications.find((a) => String(a.id) === String(appId));
      if (app?.project_id) {
        const project = await fetchProject(app.project_id);
        setEnvironments(project.environments || []);
      }
    } catch (e) { /* ignore */ }
  }

  async function handleEnvironmentChange(envId) {
    setForm((prev) => ({ ...prev, environment_id: envId, service_id: '' }));
    setServices([]);
    if (!envId) return;
    const env = environments.find((e) => String(e.id) === String(envId));
    if (!env) return;
    try {
      const app = applications.find((a) => String(a.id) === String(form.application_id));
      if (app?.project_id) {
        const svcData = await fetchServices(app.project_id, envId);
        setServices(Array.isArray(svcData) ? svcData : []);
      }
    } catch (e) { /* ignore */ }
  }

  async function handleLink() {
    if (!form.application_id || !form.environment_id || !form.service_id || !showLinker) return;
    setLinking(true);
    setResult(null);
    try {
      const res = await linkContainer(
        showLinker.id,
        parseInt(form.application_id),
        parseInt(form.environment_id),
        parseInt(form.service_id)
      );
      setResult({ success: true, message: 'Container linked successfully' });
      setTimeout(() => { setShowLinker(null); loadContainers(); }, 1500);
    } catch (e) {
      setResult({ success: false, message: e.response?.data?.error?.message || e.message });
    } finally {
      setLinking(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Unmapped Assets</h1>
        <p className="text-sm text-slate-500 mt-1">Discovered containers and VMs that are not yet linked to applications, environments, or services</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="text-slate-400 animate-spin" />
        </div>
      ) : containers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Search size={32} />
          <p className="font-medium">No unmapped assets found</p>
          <p className="text-sm">All discovered containers are already linked.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Image</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Host</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <span className="block text-xs text-slate-400 font-mono">{c.container_id ? c.container_id.slice(0, 12) : '-'}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{c.image || '-'}</td>
                  <td className="py-3 px-4 text-slate-600">{c.host_name || '-'}</td>
                  <td className="py-3 px-4 text-slate-600">{c.provider_name || '-'}</td>
                  <td className="py-3 px-4"><Badge status={c.status} /></td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openLinker(c)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      <Link2 size={12} /> Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showLinker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowLinker(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Link Container</h3>
              <button onClick={() => setShowLinker(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Link <strong>{showLinker.name}</strong> to an application, environment, and service.</p>

            {result && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {result.success && <Check size={14} className="inline mr-1" />}
                {result.success ? 'Linked successfully!' : result.message}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Application</label>
                <select
                  value={form.application_id}
                  onChange={(e) => handleApplicationChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">Select application...</option>
                  {applications.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Environment</label>
                <select
                  value={form.environment_id}
                  onChange={(e) => handleEnvironmentChange(e.target.value)}
                  disabled={!form.application_id}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-slate-50"
                >
                  <option value="">Select environment...</option>
                  {environments.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Service</label>
                <select
                  value={form.service_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, service_id: e.target.value }))}
                  disabled={!form.environment_id}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-slate-50"
                >
                  <option value="">Select service...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLinker(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLink}
                disabled={!form.application_id || !form.environment_id || !form.service_id || linking}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {linking ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {linking ? 'Linking...' : 'Link Container'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={loadContainers} className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors">
        <RefreshCw size={14} /> Refresh
      </button>
    </div>
  );
}
