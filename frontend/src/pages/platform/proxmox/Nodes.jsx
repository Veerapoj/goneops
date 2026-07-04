import { useState, useEffect, useCallback } from 'react';
import { Server, AlertTriangle, Loader2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchProxmoxProviders, fetchProxmoxNodes } from '../../../api/client';

export default function ProxmoxNodes() {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

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

  const loadNodes = useCallback(async (providerId) => {
    setNodesLoading(true);
    try {
      const data = await fetchProxmoxNodes(providerId);
      setNodes(Array.isArray(data) ? data : []);
    } catch (e) {
      setNodes([]);
    } finally {
      setNodesLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  useEffect(() => {
    if (selectedProvider) {
      loadNodes(selectedProvider);
    } else {
      setNodes([]);
    }
  }, [selectedProvider, loadNodes]);

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
        <h1 className="text-[22px] font-semibold text-slate-800">Proxmox Nodes</h1>
        <p className="text-sm text-slate-500 mt-1">Physical nodes in your Proxmox cluster</p>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Server size={28} className="text-slate-300" />
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
                  onClick={() => setSelectedProvider(p.id)}
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

          {nodesLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} className="text-slate-400 animate-spin" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Server size={28} className="text-slate-300" />
              <p className="text-slate-500 text-sm">No nodes discovered.</p>
              <p className="text-slate-400 text-xs">Test the connection and sync inventory first.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Node</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPU</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Memory</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Uptime</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node) => {
                    const isExpanded = expanded === node.node;
                    const online = node.status === 'online';
                    const uptime = node.uptime ? Math.floor(node.uptime / 86400) + 'd ' + Math.floor((node.uptime % 86400) / 3600) + 'h' : '-';
                    const cpuPct = node.cpu ? (node.cpu * 100).toFixed(1) + '%' : '-';
                    const memPct = node.mem && node.maxmem ? ((node.mem / node.maxmem) * 100).toFixed(1) + '%' : '-';
                    return (
                      <tr key={node.node} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td colSpan={5} className="p-0">
                          <div className="w-full">
                            <button
                              onClick={() => setExpanded(isExpanded ? null : node.node)}
                              className="w-full flex items-center py-3 px-4 text-left text-sm hover:bg-slate-50 transition-colors"
                            >
                              <span className="mr-2 text-slate-400">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </span>
                              <span className="font-medium text-slate-800">{node.node}</span>
                              <span className="ml-auto mr-6">
                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${online ? 'text-emerald-600' : 'text-red-600'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                  {node.status || 'unknown'}
                                </span>
                              </span>
                              <span className="mr-6 text-xs text-slate-600">{cpuPct}</span>
                              <span className="mr-6 text-xs text-slate-600">{memPct}</span>
                              <span className="mr-2 text-xs text-slate-600">{uptime}</span>
                            </button>
                            {isExpanded && (
                              <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-xs text-slate-500 font-medium">IP</span>
                                    <p className="text-slate-700">{node.ip || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs text-slate-500 font-medium">CPU Model</span>
                                    <p className="text-slate-700 truncate">{node.cpuinfo?.model || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs text-slate-500 font-medium">CPU Cores</span>
                                    <p className="text-slate-700">{node.maxcpu || '-'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs text-slate-500 font-medium">Memory Total</span>
                                    <p className="text-slate-700">{node.maxmem ? Math.round(node.maxmem / 1073741824) + ' GB' : '-'}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-xs text-slate-500 font-medium">PVE Version</span>
                                    <p className="text-slate-700">{node.pveversion || '-'}</p>
                                  </div>
                                </div>
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
