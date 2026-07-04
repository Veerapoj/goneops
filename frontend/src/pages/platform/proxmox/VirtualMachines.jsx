import { useState, useEffect, useCallback } from 'react';
import { Server, Cpu, HardDrive, AlertTriangle, Loader2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchProxmoxProviders, fetchProxmoxVMs, fetchProxmoxVM } from '../../../api/client';

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
          <Cpu size={28} className="text-slate-300" />
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

          {vmsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="text-slate-400 animate-spin" />
            </div>
          ) : vms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Cpu size={28} className="text-slate-300" />
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
                  </tr>
                </thead>
                <tbody>
                  {vms.map((vm) => {
                    const key = `${vm.vmid}-${vm.type}`;
                    const isExpanded = expanded === key;
                    const running = vm.status === 'running';
                    return (
                      <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td colSpan={7} className="p-0">
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
                              <span className="mr-2 text-xs text-slate-600">{diskGb(vm.disk || vm.maxdisk)}</span>
                            </button>
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
