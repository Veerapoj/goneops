import { useState, useEffect, useCallback } from 'react';
import { Copy, AlertTriangle, Loader2, RefreshCw, Play } from 'lucide-react';
import { fetchProxmoxProviders, fetchTemplates, cloneTemplate } from '../../../api/client';

export default function ProxmoxTemplates() {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cloneForm, setCloneForm] = useState(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneTargetNode, setCloneTargetNode] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState(null);
  const [cloneResult, setCloneResult] = useState(null);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProxmoxProviders();
      const list = Array.isArray(data) ? data : [];
      setProviders(list);
      if (list.length > 0 && !selectedProvider) {
        setSelectedProvider(list[0].id);
      }
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async (providerId) => {
    setTemplatesLoading(true);
    try {
      const data = await fetchTemplates(providerId);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  useEffect(() => {
    if (selectedProvider) {
      loadTemplates(selectedProvider);
    } else {
      setTemplates([]);
    }
  }, [selectedProvider, loadTemplates]);

  async function handleClone(template) {
    if (!cloneName.trim()) {
      setCloneError('Name is required');
      return;
    }
    setCloning(true);
    setCloneError(null);
    setCloneResult(null);
    try {
      const result = await cloneTemplate(selectedProvider, template.vmid, {
        name: cloneName.trim(),
        target_node: cloneTargetNode.trim() || undefined,
      });
      setCloneResult(result);
      if (result.approval_id) {
        setCloneResult({ ...result, message: 'Clone pending admin approval' });
      }
      setCloneForm(null);
      setCloneName('');
      setCloneTargetNode('');
    } catch (e) {
      setCloneError(e.response?.data?.error?.message || e.message);
    } finally {
      setCloning(false);
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
        <button onClick={loadProviders} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const memoryGb = (bytes) => bytes ? (bytes / 1073741824).toFixed(1) + ' GB' : '-';
  const diskGb = (bytes) => bytes ? (bytes / 1073741824).toFixed(1) + ' GB' : '-';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Templates</h1>
        <p className="text-sm text-slate-500 mt-1">Proxmox VM templates available for cloning</p>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Copy size={28} className="text-slate-300" />
          <p className="text-slate-500 text-sm">No Proxmox providers configured.</p>
          <p className="text-slate-400 text-xs">Add a provider first from the Providers page.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-600 mb-2">Select Provider</label>
            <div className="flex flex-wrap gap-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProvider(p.id); setCloneForm(null); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedProvider === p.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {cloneResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-sm text-emerald-700">
              <span className="font-medium">Success: </span>
              {cloneResult.message || 'Clone initiated'}
              {cloneResult.newid && <span className="ml-2">(New VM ID: {cloneResult.newid})</span>}
              {cloneResult.status === 'pending' && <span className="ml-2">— awaiting admin approval</span>}
            </div>
          )}

          {cloneError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
              {cloneError}
            </div>
          )}

          {templatesLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="text-slate-400 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Copy size={28} className="text-slate-300" />
              <p className="text-slate-500 text-sm">No templates found on this provider.</p>
              <p className="text-slate-400 text-xs">Templates are marked with template=1 in Proxmox QEMU VMs.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">VMID</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Node</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPU</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Memory</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Disk</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tmpl) => (
                    <tr key={`${tmpl.vmid}-${tmpl.node}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-sm font-medium text-slate-800">{tmpl.name || `ID ${tmpl.vmid}`}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{tmpl.vmid}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{tmpl.node || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{tmpl.cpus || tmpl.maxcpu || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{memoryGb(tmpl.mem || tmpl.maxmem)}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{diskGb(tmpl.disk || tmpl.maxdisk)}</td>
                      <td className="py-3 px-4">
                        {cloneForm === tmpl.vmid ? (
                          <div className="flex flex-col gap-2">
                            <input
                              type="text" value={cloneName} onChange={(e) => setCloneName(e.target.value)}
                              className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="New VM name"
                              autoFocus
                            />
                            <input
                              type="text" value={cloneTargetNode} onChange={(e) => setCloneTargetNode(e.target.value)}
                              className="px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Target node (optional)"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleClone(tmpl)}
                                disabled={cloning}
                                className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                {cloning ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                Clone
                              </button>
                              <button
                                onClick={() => { setCloneForm(null); setCloneName(''); setCloneTargetNode(''); setCloneError(null); }}
                                className="px-2 py-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCloneForm(tmpl.vmid)}
                            className="px-3 py-1 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-50 flex items-center gap-1"
                          >
                            <Copy size={12} /> Clone
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
