import { useState, useEffect, useCallback } from 'react';
import { GitGraph, AlertTriangle, Loader2, RefreshCw, Camera, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchProxmoxProviders, fetchProxmoxVMs, fetchSnapshots, createSnapshot, rollbackSnapshot } from '../../../api/client';

export default function ProxmoxSnapshots() {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vmsLoading, setVmsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [snapLoading, setSnapLoading] = useState(false);
  const [snapError, setSnapError] = useState(null);
  const [showCreate, setShowCreate] = useState(null);
  const [snapName, setSnapName] = useState('');
  const [snapDesc, setSnapDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [rollingBack, setRollingBack] = useState(null);
  const [resultMsg, setResultMsg] = useState(null);

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

  const loadVMs = useCallback(async (providerId) => {
    setVmsLoading(true);
    try {
      const data = await fetchProxmoxVMs(providerId);
      setVms(Array.isArray(data) ? data : []);
    } catch (e) {
      setVms([]);
    } finally {
      setVmsLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  useEffect(() => {
    if (selectedProvider) {
      loadVMs(selectedProvider);
      setExpanded(null);
    } else {
      setVms([]);
    }
  }, [selectedProvider, loadVMs]);

  async function handleExpand(vmKey) {
    if (expanded === vmKey) {
      setExpanded(null);
      setSnapshots([]);
      return;
    }
    setExpanded(vmKey);
    setSnapLoading(true);
    setSnapError(null);
    try {
      const vm = vms.find((v) => `${v.vmid}-${v.type}` === vmKey);
      if (vm && selectedProvider) {
        const data = await fetchSnapshots(selectedProvider, vm.vmid);
        setSnapshots(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      setSnapError(e.response?.data?.error?.message || e.message);
    } finally {
      setSnapLoading(false);
    }
  }

  async function handleCreate(vm) {
    if (!snapName.trim()) return;
    setCreating(true);
    setResultMsg(null);
    try {
      const result = await createSnapshot(selectedProvider, vm.vmid, {
        snapname: snapName.trim(),
        description: snapDesc.trim() || undefined,
      });
      setResultMsg({ type: 'success', text: result.message || 'Snapshot creation submitted' });
      setShowCreate(null);
      setSnapName('');
      setSnapDesc('');
      setTimeout(async () => {
        await handleExpand(`${vm.vmid}-${vm.type}`);
      }, 500);
    } catch (e) {
      setResultMsg({ type: 'error', text: e.response?.data?.error?.message || e.message });
    } finally {
      setCreating(false);
    }
  }

  async function handleRollback(vm, snap) {
    setRollingBack(snap.name);
    setResultMsg(null);
    try {
      const result = await rollbackSnapshot(selectedProvider, vm.vmid, snap.name);
      setResultMsg({ type: 'success', text: result.status === 'pending'
        ? `Rollback pending admin approval`
        : (result.message || 'Rollback submitted') });
    } catch (e) {
      setResultMsg({ type: 'error', text: e.response?.data?.error?.message || e.message });
    } finally {
      setRollingBack(null);
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Snapshots</h1>
        <p className="text-sm text-slate-500 mt-1">Create and manage VM snapshots</p>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <GitGraph size={28} className="text-slate-300" />
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
                  onClick={() => { setSelectedProvider(p.id); setExpanded(null); }}
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

          {resultMsg && (
            <div className={`border rounded-xl p-4 mb-6 text-sm ${resultMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {resultMsg.text}
            </div>
          )}

          {vmsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="text-slate-400 animate-spin" />
            </div>
          ) : vms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <GitGraph size={28} className="text-slate-300" />
              <p className="text-slate-500 text-sm">No VMs or containers discovered.</p>
              <p className="text-slate-400 text-xs">Sync inventory from the Providers page first.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Node</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Snapshots</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vms.map((vm) => {
                    const key = `${vm.vmid}-${vm.type}`;
                    const isExpanded = expanded === key;
                    const running = vm.status === 'running';
                    return (
                      <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td colSpan={6} className="p-0">
                          <div className="w-full">
                            <button
                              onClick={() => handleExpand(key)}
                              className="w-full flex items-center py-3 px-4 text-left text-sm hover:bg-slate-50 transition-colors"
                            >
                              <span className="mr-2 text-slate-400">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                              <span className="font-medium text-slate-800">{vm.name || `ID ${vm.vmid}`}</span>
                              <span className="ml-4">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${vm.type === 'qemu' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                  {vm.type === 'qemu' ? 'VM' : 'LXC'}
                                </span>
                              </span>
                              <span className="ml-auto mr-6">
                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${running ? 'text-emerald-600' : 'text-red-600'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                  {vm.status || 'unknown'}
                                </span>
                              </span>
                              <span className="mr-6 text-xs text-slate-600">{vm.node || '-'}</span>
                              <span className="mr-6 text-xs text-slate-600">{snapshots.length} snapshot(s)</span>
                              <span className="mr-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowCreate(vm.vmid); }}
                                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex items-center gap-1"
                                >
                                  <Camera size={12} /> Create
                                </button>
                              </span>
                            </button>

                            {showCreate === vm.vmid && (
                              <div className="px-8 py-3 bg-slate-50/50 border-t border-slate-100">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="text" value={snapName} onChange={(e) => setSnapName(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Snapshot name"
                                    autoFocus
                                  />
                                  <input
                                    type="text" value={snapDesc} onChange={(e) => setSnapDesc(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                                    placeholder="Description (optional)"
                                  />
                                  <button
                                    onClick={() => handleCreate(vm)}
                                    disabled={creating || !snapName.trim()}
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {creating ? <Loader2 size={12} className="animate-spin" /> : null}
                                    Save
                                  </button>
                                  <button
                                    onClick={() => { setShowCreate(null); setSnapName(''); setSnapDesc(''); }}
                                    className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {isExpanded && (
                              <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100">
                                {snapLoading ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 size={20} className="text-slate-400 animate-spin" />
                                  </div>
                                ) : snapError ? (
                                  <p className="text-sm text-red-500">{snapError}</p>
                                ) : snapshots.length === 0 ? (
                                  <p className="text-sm text-slate-400">No snapshots found for this VM.</p>
                                ) : (
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase">Snapshots</h4>
                                    {snapshots.map((snap) => (
                                      <div key={snap.name} className="flex items-center justify-between py-2 px-3 bg-white border border-slate-200 rounded-lg">
                                        <div>
                                          <span className="text-sm font-medium text-slate-700">{snap.name}</span>
                                          {snap.description && <span className="ml-2 text-xs text-slate-400">— {snap.description}</span>}
                                          {snap.snaptime && (
                                            <span className="ml-2 text-xs text-slate-400">
                                              {new Date(snap.snaptime * 1000).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => handleRollback(vm, snap)}
                                          disabled={rollingBack === snap.name}
                                          className="px-3 py-1 border border-amber-200 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1"
                                        >
                                          {rollingBack === snap.name ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                          Rollback
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
