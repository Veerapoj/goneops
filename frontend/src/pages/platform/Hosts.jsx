import { useState, useEffect, useCallback } from 'react';
import { Server, Monitor, ChevronDown, ChevronRight, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { fetchHosts } from '../../api/client';

export default function Hosts() {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHosts();
      setHosts(data);
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
        <h1 className="text-[22px] font-semibold text-slate-800">Infrastructure Inventory</h1>
        <p className="text-sm text-slate-500 mt-1">Complete CMDB of your infrastructure</p>
      </div>

      {hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Server size={28} className="text-slate-300" />
          <p className="text-slate-500 text-sm">No hosts discovered yet.</p>
          <p className="text-slate-400 text-xs">Connect a provider to begin discovery.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Hostname</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CPU</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Memory</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((host) => {
                const isExpanded = expanded === host.id;
                return (
                  <tr key={host.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td colSpan={7} className="p-0">
                      <div className="w-full">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : host.id)}
                          className="w-full flex items-center py-3 px-4 text-left text-sm hover:bg-slate-50 transition-colors"
                        >
                          <span className="mr-2 text-slate-400">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                          <span className="font-medium text-slate-800">{host.hostname}</span>
                          <span className="ml-4 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500 capitalize">{host.host_type}</span>
                          <span className="ml-4 text-xs text-indigo-500">{host.ip_address || '-'}</span>
                          <span className="ml-auto mr-6 text-xs text-slate-600">{host.cpu_cores > 0 ? `${host.cpu_cores}` : '-'}</span>
                          <span className="mr-6 text-xs text-slate-600">{host.memory_total_gb > 0 ? `${host.memory_total_gb}G` : '-'}</span>
                          <span className="mr-6 text-xs text-slate-600">{host.provider_name || '-'}</span>
                          <span className="mr-2">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                              host.status === 'running' ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${host.status === 'running' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                              {host.status || 'unknown'}
                            </span>
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-xs text-slate-500 font-medium">OS</span>
                                <p className="text-slate-700">{host.os_name || '-'} {host.os_version || ''}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 font-medium">Owner</span>
                                <p className="text-slate-700">{host.owner || '-'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 font-medium">Project</span>
                                <p className="text-slate-700">{host.project_name || '-'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 font-medium">Environment</span>
                                <p className="text-slate-700">{host.environment || '-'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 font-medium">CPU Usage</span>
                                <p className="text-slate-700">{host.cpu_usage_pct > 0 ? `${host.cpu_usage_pct}%` : '-'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 font-medium">Memory Usage</span>
                                <p className="text-slate-700">{host.memory_usage_pct > 0 ? `${host.memory_usage_pct}%` : '-'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 font-medium">Disk Total</span>
                                <p className="text-slate-700">{host.disk_total_gb > 0 ? `${host.disk_total_gb} GB` : '-'}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 font-medium">Discovered</span>
                                <p className="text-slate-700">{host.discovered_at ? new Date(host.discovered_at).toLocaleDateString() : '-'}</p>
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
    </div>
  );
}
