import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Server, Cpu, Box, Globe, AlertTriangle,
  HardDrive, Zap, Monitor, Loader2, RefreshCw, Plug,
} from 'lucide-react';
import { fetchPlatformDashboard, fetchProviders } from '../../api/client';

const STAT_ICONS = {
  hosts: Server,
  vms: Monitor,
  containers: Box,
  applications: Globe,
  providers: Plug,
  issues: AlertTriangle,
};

export default function PlatformOverview() {
  const [stats, setStats] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, prov] = await Promise.all([
        fetchPlatformDashboard(),
        fetchProviders(),
      ]);
      setStats(dash);
      setProviders(prov);
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

  if (!stats) return null;

  const statCards = [
    { key: 'hosts', label: 'Hosts', value: stats.hosts || 0 },
    { key: 'vms', label: 'VMs', value: stats.vms || 0 },
    { key: 'containers', label: 'Containers', value: stats.containers || 0 },
    { key: 'applications', label: 'Applications', value: stats.applications || 0 },
    { key: 'providers', label: 'Providers', value: stats.connected_providers || 0 },
    { key: 'issues', label: 'Issues', value: stats.critical_certs || 0 },
  ];

  const resources = stats.resources || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Complete infrastructure visibility across your organization</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = STAT_ICONS[stat.key] || Box;
          return (
            <div key={stat.key} className="bg-white border border-slate-200 rounded-2xl p-5 text-center soft-shadow">
              <Icon size={22} className="mx-auto text-indigo-500 mb-3" />
              <div className="text-2xl font-semibold text-indigo-600">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Connected Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {providers.map((provider) => {
            const connected = provider.status === 'connected';
            return (
              <div
                key={provider.id}
                className={`bg-white border border-slate-200 rounded-2xl p-5 soft-shadow cursor-pointer transition-colors hover:border-slate-300 ${
                  connected ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'
                }`}
              >
                <div className="text-2xl mb-3">
                  {provider.type === 'proxmox' ? <HardDrive size={22} className="text-indigo-500" /> :
                   provider.type === 'kubernetes' ? <Zap size={22} className="text-indigo-500" /> :
                   provider.type === 'docker' ? <Box size={22} className="text-indigo-500" /> :
                   <Globe size={22} className="text-slate-400" />}
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">{provider.name}</h3>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-3 ${
                  connected ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {provider.status === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
                <div className="text-sm font-semibold text-indigo-600">
                  {provider.nodes_count > 0 ? `${provider.nodes_count} Nodes` : 'No resources'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Resource Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <div key={resource.name} className="bg-white border border-slate-200 rounded-2xl p-5 soft-shadow">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">{resource.name}</h3>
              <div className="mb-3">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      resource.percent > 80 ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${resource.percent}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Used: {resource.used} {resource.unit}</span>
                <span className="font-semibold text-slate-700">{Math.round(resource.percent)}%</span>
              </div>
              <div className="text-xs text-slate-400">Total: {resource.total} {resource.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
