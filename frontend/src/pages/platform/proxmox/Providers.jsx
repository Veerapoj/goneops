import { useState, useEffect, useCallback } from 'react';
import { Plug, AlertTriangle, Loader2, RefreshCw, CheckCircle2, XCircle, Trash2, Network, Cpu, History } from 'lucide-react';
import {
  fetchProxmoxProviders,
  createProxmoxProvider,
  testProxmoxProvider,
  syncProxmoxInventory,
} from '../../../api/client';

export default function ProxmoxProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', host: '', port: '8006', token_user: '', token_id: '', token_secret: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [testingProvider, setTestingProvider] = useState(null);
  const [syncingProvider, setSyncingProvider] = useState(null);
  const [testResults, setTestResults] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProxmoxProviders();
      setProviders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await createProxmoxProvider(formData);
      setShowForm(false);
      setFormData({ name: '', host: '', port: '8006', token_user: '', token_id: '', token_secret: '' });
      await loadData();
    } catch (e) {
      setFormError(e.response?.data?.error?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTest(providerId) {
    setTestingProvider(providerId);
    try {
      const result = await testProxmoxProvider(providerId);
      setTestResults((prev) => ({ ...prev, [providerId]: result }));
      await loadData();
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [providerId]: { result: 'failure', message: e.response?.data?.error?.message || e.message } }));
    } finally {
      setTestingProvider(null);
    }
  }

  async function handleSync(providerId) {
    setSyncingProvider(providerId);
    try {
      await syncProxmoxInventory(providerId);
      await loadData();
    } catch (e) {
      alert('Sync failed: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setSyncingProvider(null);
    }
  }

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
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-800">Proxmox Providers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage connections to Proxmox virtualization hosts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Add Provider
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow mb-8">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Add Proxmox Provider</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="My Proxmox"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Host</label>
                <input
                  type="text" value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="192.168.1.165"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Port</label>
                <input
                  type="text" value={formData.port} onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="8006"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Token User</label>
                <input
                  type="text" value={formData.token_user} onChange={(e) => setFormData({ ...formData, token_user: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="goneops@pve"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Token ID</label>
                <input
                  type="text" value={formData.token_id} onChange={(e) => setFormData({ ...formData, token_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="goneops-api"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Token Secret</label>
                <input
                  type="password" value={formData.token_secret} onChange={(e) => setFormData({ ...formData, token_secret: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="API token secret"
                  required
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin inline" /> : null} Save Provider
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(null); }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Network size={28} className="text-slate-300" />
          <p className="text-slate-500 text-sm">No Proxmox providers configured.</p>
          <p className="text-slate-400 text-xs">Add a Proxmox provider to begin discovery.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {providers.map((provider) => {
            const connected = provider.status === 'connected';
            const testResult = testResults[provider.id];
            const isTesting = testingProvider === provider.id;
            const isSyncing = syncingProvider === provider.id;

            return (
              <div key={provider.id} className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">{provider.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{provider.host}:{provider.port}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTesting ? <Loader2 size={16} className="animate-spin text-blue-500" /> : null}
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${connected ? 'text-emerald-600' : 'text-red-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {provider.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
                  <span>User: {provider.token_user}</span>
                  <span>Token: {provider.token_id}</span>
                  {provider.last_tested_at && (
                    <span>Tested: {new Date(provider.last_tested_at).toLocaleString()}</span>
                  )}
                  {provider.last_synced_at && (
                    <span>Synced: {new Date(provider.last_synced_at).toLocaleString()}</span>
                  )}
                </div>

                {testResult && (
                  <div className={`p-3 rounded-xl mb-4 text-sm ${testResult.result === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      {testResult.result === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {testResult.result === 'success' ? 'Connected' : 'Failed'}
                    </div>
                    <p className="text-xs mt-1 opacity-80">{testResult.message}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleTest(provider.id)}
                    disabled={isTesting}
                    className="flex-1 px-3 py-2 rounded-lg border border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isTesting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Test Connection
                  </button>
                  <button
                    onClick={() => handleSync(provider.id)}
                    disabled={isSyncing}
                    className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Sync Inventory
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
