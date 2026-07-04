import { useState, useEffect, useCallback } from 'react';
import { Play, Square, RefreshCcw, Camera, RotateCcw, AlertTriangle, Loader2, RefreshCw, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { fetchProxmoxProviders, fetchProxmoxVMs, fetchProxmoxVM, startVM, stopVM, rebootVM, createSnapshot, deleteProxmoxVM, deleteProxmoxLXC } from '../../../api/client';

export default function ProxmoxVirtualMachines() {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vmsLoading, setVmsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [vmDetail, setVmDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [snapName, setSnapName] = useState('');
  const [actionResult, setActionResult] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
    } else {
      setVms([]);
    }
  }, [selectedProvider, loadVMs]);

  async function handleExpand(vmKey) {
    if (expanded === vmKey) {
      setExpanded(null);
      setVmDetail(null);
      return;
    }
    setExpanded(vmKey);
    setVmDetail(null);
    setDetailLoading(true);
    try {
      const vm = vms.find((v) => `${v.vmid}-${v.type}` === vmKey);
      if (vm && selectedProvider) {
        const detail = await fetchProxmoxVM(selectedProvider, vm.vmid);
        setVmDetail(detail);
      }
    } catch (e) {
      setVmDetail({ error: e.response?.data?.error?.message || e.message });
    } finally {
      setDetailLoading(false);
    }
  }

  async function executeAction(vm, action) {
    setActionLoading(action);
    setActionResult(null);
    setConfirmAction(null);
    try {
      let result;
      if (action === 'start') result = await startVM(selectedProvider, vm.vmid);
      else if (action === 'stop') result = await stopVM(selectedProvider, vm.vmid);
      else if (action === 'reboot') result = await rebootVM(selectedProvider, vm.vmid);
      setActionResult({ type: 'success', text: result.message || `VM ${action} submitted` });
      setTimeout(() => loadVMs(selectedProvider), 3000);
    } catch (e) {
      setActionResult({ type: 'error', text: e.response?.data?.error?.message || e.message });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleQuickSnapshot(vm) {
    if (!snapName.trim()) return;
    setActionLoading('snapshot');
    setActionResult(null);
    try {
      const result = await createSnapshot(selectedProvider, vm.vmid, { snapname: snapName.trim() });
      setActionResult({ type: 'success', text: result.message || 'Snapshot creation submitted' });
      setSnapName('');
      setConfirmAction(null);
    } catch (e) {
      setActionResult({ type: 'error', text: e.response?.data?.error?.message || e.message });
    } finally {
      setActionLoading(null);
    }
  }

  async function executeDelete(vm) {
    const expectedText = `delete ${vm.name || vm.vmid}`;
    if (deleteConfirmText !== expectedText) return;
    setActionLoading('delete');
    setActionResult(null);
    setDeleteConfirm(null);
    setDeleteConfirmText('');
    try {
      let result;
      if (vm.type === 'lxc') {
        result = await deleteProxmoxLXC(selectedProvider, vm.vmid);
      } else {
        result = await deleteProxmoxVM(selectedProvider, vm.vmid);
      }
      setActionResult({ type: 'success', text: result.message || `${vm.type === 'lxc' ? 'LXC' : 'VM'} deletion submitted` });
      setTimeout(() => loadVMs(selectedProvider), 3000);
    } catch (e) {
      setActionResult({ type: 'error', text: e.response?.data?.error?.message || e.message });
    } finally {
      setActionLoading(null);
    }
  }

  const storedRole = (() => { try { return localStorage.getItem('goneops-role') || 'operator'; } catch (e) { return 'operator'; } })();
  const isAdmin = storedRole === 'admin';

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
        <h1 className="text-[22px] font-semibold text-slate-800">Virtual Machines & Containers</h1>
        <p className="text-sm text-slate-500 mt-1">All VMs and LXC containers across your Proxmox cluster</p>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <RefreshCcw size={28} className="text-slate-300" />
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
                  onClick={() => { setSelectedProvider(p.id); setExpanded(null); setVmDetail(null); }}
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

          {actionResult && (
            <div className={`border rounded-xl p-4 mb-6 text-sm ${actionResult.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {actionResult.text}
            </div>
          )}

          {vmsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="text-slate-400 animate-spin" />
            </div>
          ) : vms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <RefreshCcw size={28} className="text-slate-300" />
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
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPU</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Memory</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Disk</th>
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
                        <td colSpan={8} className="p-0">
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
                              <span className="mr-6 text-xs text-slate-600">{vm.cpus || vm.maxcpu || '-'}</span>
                              <span className="mr-6 text-xs text-slate-600">{memoryGb(vm.mem || vm.maxmem)}</span>
                              <span className="mr-6 text-xs text-slate-600">{diskGb(vm.disk || vm.maxdisk)}</span>
                              <span className="mr-2 flex items-center gap-1">
                                {actionLoading && confirmAction === `${key}-${actionLoading}` ? (
                                  <Loader2 size={14} className="animate-spin text-blue-500" />
                                ) : (
                                  <>
                                    {running ? (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmAction(key + '-stop'); }}
                                        className="px-2 py-1 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 flex items-center gap-1"
                                      >
                                        <Square size={12} /> Stop
                                      </button>
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); executeAction(vm, 'start'); }}
                                        disabled={actionLoading !== null}
                                        className="px-2 py-1 border border-emerald-200 text-emerald-600 rounded-lg text-xs hover:bg-emerald-50 flex items-center gap-1 disabled:opacity-50"
                                      >
                                        {actionLoading === 'start' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                        Start
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setConfirmAction(key + '-reboot'); }}
                                      className="px-2 py-1 border border-amber-200 text-amber-600 rounded-lg text-xs hover:bg-amber-50 flex items-center gap-1"
                                    >
                                      <RefreshCcw size={12} /> Reboot
                                    </button>
                                    {isAdmin && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(key); setDeleteConfirmText(''); }}
                                        className="px-2 py-1 border border-red-300 text-red-600 rounded-lg text-xs hover:bg-red-50 flex items-center gap-1"
                                      >
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    )}
                                  </>
                                )}
                              </span>
                            </button>

                            {confirmAction === key + '-stop' && (
                              <div className="px-8 py-2 bg-red-50/50 border-t border-red-100 flex items-center gap-3">
                                <span className="text-sm text-red-700">Confirm stop VM {vm.name || vm.vmid}?</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); executeAction(vm, 'stop'); }}
                                  disabled={actionLoading !== null}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                                >
                                  {actionLoading === 'stop' ? <Loader2 size={12} className="animate-spin" /> : null} Yes, Stop
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmAction(null); }}
                                  className="px-3 py-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}

                            {confirmAction === key + '-reboot' && (
                              <div className="px-8 py-2 bg-amber-50/50 border-t border-amber-100 flex items-center gap-3">
                                <span className="text-sm text-amber-700">Confirm reboot VM {vm.name || vm.vmid}?</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); executeAction(vm, 'reboot'); }}
                                  disabled={actionLoading !== null}
                                  className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
                                >
                                  {actionLoading === 'reboot' ? <Loader2 size={12} className="animate-spin" /> : null} Yes, Reboot
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmAction(null); }}
                                  className="px-3 py-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}

                            {deleteConfirm === key && (
                              <div className="px-8 py-3 bg-red-50/50 border-t border-red-200 flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle size={16} className="text-red-500" />
                                  <span className="text-sm font-semibold text-red-700">
                                    Delete {vm.type === 'qemu' ? 'VM' : 'LXC'} {vm.name || vm.vmid}
                                  </span>
                                </div>
                                <p className="text-xs text-red-600">
                                  This permanently destroys the {vm.type === 'qemu' ? 'VM' : 'LXC'} and all disks. Type <strong>{`delete ${vm.name || vm.vmid}`}</strong> to confirm.
                                </p>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="px-3 py-1.5 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder={`delete ${vm.name || vm.vmid}`}
                                    autoFocus
                                  />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); executeDelete(vm); }}
                                    disabled={actionLoading === 'delete' || deleteConfirmText !== `delete ${vm.name || vm.vmid}`}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {actionLoading === 'delete' ? <Loader2 size={12} className="animate-spin" /> : null} Yes, Delete
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); setDeleteConfirmText(''); }}
                                    className="px-3 py-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {confirmAction === key + '-snapshot' && (
                              <div className="px-8 py-2 bg-indigo-50/50 border-t border-indigo-100 flex items-center gap-3">
                                <input
                                  type="text" value={snapName} onChange={(e) => setSnapName(e.target.value)}
                                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Snapshot name"
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleQuickSnapshot(vm); }}
                                  disabled={actionLoading === 'snapshot' || !snapName.trim()}
                                  className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  {actionLoading === 'snapshot' ? <Loader2 size={12} className="animate-spin" /> : null} Save
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmAction(null); setSnapName(''); }}
                                  className="px-3 py-1 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}

                            {isExpanded && (
                              <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100">
                                {detailLoading ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 size={20} className="text-slate-400 animate-spin" />
                                  </div>
                                ) : vmDetail && !vmDetail.error ? (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-xs text-slate-500 font-medium">VMID</span>
                                      <p className="text-slate-700">{vm.vmid}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500 font-medium">Type</span>
                                      <p className="text-slate-700 capitalize">{vm.type}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500 font-medium">Node</span>
                                      <p className="text-slate-700">{vm.node}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500 font-medium">Status</span>
                                      <p className="text-slate-700 capitalize">{vmDetail.status?.status || vm.status}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500 font-medium">CPU Cores</span>
                                      <p className="text-slate-700">{vmDetail.config?.cores || vm.cpus || '-'}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500 font-medium">Memory</span>
                                      <p className="text-slate-700">{memoryGb(vmDetail.config?.memory ? vmDetail.config.memory * 1048576 : vm.mem || vm.maxmem)}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500 font-medium">OS</span>
                                      <p className="text-slate-700">{vmDetail.config?.ostype || '-'}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-slate-500 font-medium">Boot</span>
                                      <p className="text-slate-700">{vmDetail.config?.boot || '-'}</p>
                                    </div>
                                    <div className="col-span-full flex gap-2 mt-2 pt-2 border-t border-slate-100">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmAction(key + '-snapshot'); }}
                                        className="px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-50 flex items-center gap-1"
                                      >
                                        <Camera size={12} /> Quick Snapshot
                                      </button>
                                      <a
                                        href="/platform/proxmox/snapshots"
                                        className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1"
                                      >
                                        <RotateCcw size={12} /> Manage Snapshots
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-red-500">{vmDetail?.error || 'Failed to load details'}</p>
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
