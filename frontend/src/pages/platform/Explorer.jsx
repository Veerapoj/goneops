import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronRight, ChevronDown, Box, Server, Container, Globe, Monitor, Loader2, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { fetchInventoryMapping, fetchApplications, fetchPlatformDashboard } from '../../api/client';

function statusColor(status) {
  switch (status) {
    case 'running':
    case 'healthy':
    case 'connected':
      return 'bg-emerald-400';
    case 'stopped':
    case 'exited':
      return 'bg-slate-400';
    case 'unhealthy':
    case 'error':
      return 'bg-red-400';
    default:
      return 'bg-amber-400';
  }
}

function statusTextColor(status) {
  switch (status) {
    case 'running':
    case 'healthy':
    case 'connected':
      return 'text-emerald-600';
    case 'stopped':
    case 'exited':
      return 'text-slate-500';
    case 'unhealthy':
    case 'error':
      return 'text-red-600';
    default:
      return 'text-amber-600';
  }
}

function Section({ title, icon: Icon, children, defaultExpanded = true }) {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl soft-shadow overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
      >
        <Icon size={18} className="text-slate-500" />
        <span className="text-base font-semibold text-slate-800 flex-1 text-left">{title}</span>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-100 px-5 py-4">{children}</div>}
    </div>
  );
}

function Badge({ status, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusTextColor(status)}`}>
      <span className={`w-2 h-2 rounded-full ${statusColor(status)}`} />
      {label || status || 'unknown'}
    </span>
  );
}

function Node({ label, badges, children, indent = 0 }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ paddingLeft: indent * 16 }}>
      <div className="flex items-center gap-2 py-1.5">
        {children ? (
          <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-slate-600">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[14px]" />
        )}
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {badges && badges.map((b, i) => <Badge key={i} {...b} />)}
        </div>
      </div>
      {open && children && <div>{children}</div>}
    </div>
  );
}

export default function Explorer() {
  const [appName, setAppName] = useState('');
  const [applications, setApplications] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    async function loadApps() {
      try {
        const apps = await fetchApplications();
        setApplications(apps);
      } catch (e) {
        console.error('Failed to load applications', e);
      } finally {
        setAppsLoading(false);
      }
    }
    async function loadLastSync() {
      try {
        const overview = await fetchPlatformDashboard();
        setLastSync(overview.last_sync);
      } catch (e) { /* ignore */ }
    }
    loadApps();
    loadLastSync();
  }, []);

  const loadMapping = useCallback(async (name) => {
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInventoryMapping(name);
      setData(result);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (appName) loadMapping(appName);
  }, [appName, loadMapping]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Runtime Explorer</h1>
        <p className="text-sm text-slate-500 mt-1">Application, environment, service-to-container traceability tree</p>
        {lastSync && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <Clock size={12} />
            <span>Last sync: {new Date(lastSync).toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 appearance-none"
            >
              <option value="">Select an application...</option>
              {applications.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>
          {appName && (
            <button
              onClick={() => loadMapping(appName)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {!appName ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Search size={32} />
          <p className="font-medium">Select an application to explore its runtime topology</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="text-slate-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertTriangle size={28} className="text-red-400" />
          <p className="text-slate-600 text-sm">{error}</p>
        </div>
      ) : !data ? null : (
        <div className="space-y-6">
          <Section title={`Application: ${data.application?.name || appName}`} icon={Box}>
            <div className="text-sm text-slate-500">
              Project: {data.application?.project_name || '—'} &middot; Environments: {data.application?.env_count || 0}
            </div>
          </Section>

          {data.environments && data.environments.map((env) => (
            <Section key={env.id} title={`Environment: ${env.name}`} icon={Globe}>
              <div className="text-sm text-slate-400 mb-3">
                ID: {env.id} &middot; LXC Status: {env.lxc_status || 'none'}
              </div>
              {env.services && env.services.length === 0 ? (
                <p className="text-sm text-slate-400">No services in this environment.</p>
              ) : (
                <div className="space-y-1">
                  {env.services.map((svc) => (
                    <Node
                      key={svc.id}
                      label={`${svc.name} (${svc.type})`}
                      badges={[{ status: svc.status, label: svc.status }]}
                    >
                      {svc.runtime?.container && (
                        <Node
                          label={`Container: ${svc.runtime.container.name}`}
                          badges={[{ status: svc.runtime.container.status, label: svc.runtime.container.status }]}
                          indent={1}
                        >
                          <Node label={`Image: ${svc.runtime.container.image || '—'}`} indent={2} />
                          <Node label={`ID: ${svc.runtime.container.container_id || '—'}`} indent={2} />
                          {svc.runtime.host && (
                            <Node
                              label={`Host: ${svc.runtime.host.hostname}`}
                              badges={[{ status: svc.runtime.host.status, label: svc.runtime.host.status }]}
                              indent={2}
                            >
                              {svc.runtime.provider && (
                                <Node
                                  label={`Provider: ${svc.runtime.provider.name}`}
                                  badges={[{ status: svc.runtime.provider.status, label: svc.runtime.provider.type || svc.runtime.provider.status }]}
                                  indent={3}
                                />
                              )}
                            </Node>
                          )}
                        </Node>
                      )}
                      {svc.runtime?.vm && (
                        <Node
                          label={`VM: ${svc.runtime.vm.name} (vmid: ${svc.runtime.vm.vmid})`}
                          badges={[{ status: svc.runtime.vm.status, label: svc.runtime.vm.status }]}
                          indent={1}
                        >
                          {svc.runtime.host && (
                            <Node
                              label={`Host: ${svc.runtime.host.hostname}`}
                              badges={[{ status: svc.runtime.host.status, label: svc.runtime.host.status }]}
                              indent={2}
                            >
                              {svc.runtime.provider && (
                                <Node
                                  label={`Provider: ${svc.runtime.provider.name}`}
                                  badges={[{ status: svc.runtime.provider.status, label: svc.runtime.provider.type || svc.runtime.provider.status }]}
                                  indent={3}
                                />
                              )}
                            </Node>
                          )}
                        </Node>
                      )}
                      {!svc.runtime?.container && !svc.runtime?.vm && (
                        <Node label="No runtime asset linked" indent={1} />
                      )}
                    </Node>
                  ))}
                </div>
              )}
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}
