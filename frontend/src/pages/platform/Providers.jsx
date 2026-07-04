import { useState, useEffect, useCallback } from 'react';
import { Plug, HardDrive, Zap, Box, Globe, AlertTriangle, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { fetchProviders } from '../../api/client';

const TYPE_ICONS = {
  proxmox: HardDrive,
  kubernetes: Zap,
  docker: Box,
  aws: Globe,
  azure: Globe,
  gcp: Globe,
  bare_metal: Zap,
};

const PROVIDER_TYPES = ['Proxmox', 'Kubernetes', 'Docker', 'AWS', 'Azure', 'Bare Metal'];

function ProviderTypeBadge({ type }) {
  const Icon = TYPE_ICONS[type] || Plug;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium border border-indigo-100">
      <Icon size={12} />
      <span className="capitalize">{type.replace(/_/g, ' ')}</span>
    </span>
  );
}

export default function Providers() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProviders();
      setProviders(data);
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
        <h1 className="text-[22px] font-semibold text-slate-800">Providers</h1>
        <p className="text-sm text-slate-500 mt-1">Manage infrastructure providers and connections</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {providers.map((provider) => {
          const connected = provider.status === 'connected';
          return (
            <div key={provider.id} className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
              <h3 className="text-base font-semibold text-slate-800 mb-4">{provider.name}</h3>
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-slate-50 text-sm">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-slate-600 capitalize">{provider.status}</span>
                <span className="text-slate-400">|</span>
                <ProviderTypeBadge type={provider.type} />
                {provider.nodes_count > 0 && (
                  <>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">{provider.nodes_count} Nodes</span>
                  </>
                )}
                {provider.hosts_count > 0 && (
                  <>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">{provider.hosts_count} Hosts</span>
                  </>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>CPU Utilization</span>
                    <span>{provider.cpu_usage_pct != null ? `${provider.cpu_usage_pct}%` : '-'}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(provider.cpu_usage_pct || 0, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Memory Utilization</span>
                    <span>{provider.memory_usage_pct != null ? `${provider.memory_usage_pct}%` : '-'}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500 rounded-full" style={{ width: `${Math.min(provider.memory_usage_pct || 0, 100)}%` }} />
                  </div>
                </div>
              </div>
              {provider.last_sync_at && (
                <p className="text-xs text-slate-400 mt-3">
                  Last sync: {new Date(provider.last_sync_at).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
        <h3 className="text-base font-semibold text-slate-800 mb-5">Add New Provider</h3>
        <div className="flex flex-wrap gap-3">
          {PROVIDER_TYPES.map((type) => (
            <button
              key={type}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              + {type}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Provider connection and discovery will be available in Phase 2.
        </p>
      </div>
    </div>
  );
}
