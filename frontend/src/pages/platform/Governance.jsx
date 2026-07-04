import { useEffect, useState } from 'react';
import { Shield, Clock, ScrollText, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { fetchProxmoxProviders } from '../../api/client';

export default function Governance() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch audit logs from Proxmox Manager
        const resp = await fetch('http://192.168.1.147:4000/api/proxmox/audit-logs');
        const data = await resp.json();
        setAuditLogs(Array.isArray(data) ? data : (data.logs || []));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const actionStyle = (action) => {
    if (action?.includes('delete') || action?.includes('destroy')) return 'bg-red-50 text-red-700';
    if (action?.includes('start') || action?.includes('stop') || action?.includes('reboot')) return 'bg-amber-50 text-amber-700';
    if (action?.includes('sync') || action?.includes('create')) return 'bg-blue-50 text-blue-700';
    if (action?.includes('test') || action?.includes('connect')) return 'bg-emerald-50 text-emerald-700';
    return 'bg-slate-100 text-slate-600';
  };

  const resultIcon = (result) => {
    if (result === 'success') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (result === 'failure' || result === 'failed') return <XCircle size={14} className="text-red-500" />;
    return <Loader2 size={14} className="text-amber-500 animate-spin" />;
  };

  const stats = {
    total: auditLogs.length,
    deletions: auditLogs.filter(l => l.action?.includes('delete') || l.action?.includes('destroy')).length,
    mutations: auditLogs.filter(l => l.action?.includes('start') || l.action?.includes('stop') || l.action?.includes('reboot')).length,
    syncs: auditLogs.filter(l => l.action?.includes('sync')).length,
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-800">Governance</h1>
        <p className="text-sm text-slate-500 mt-1">Ownership, lifecycle, and audit tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 soft-shadow">
          <div className="text-xs text-slate-400 mb-1">Total Actions</div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
        </div>
        <div className="bg-white border border-red-200 rounded-2xl p-4 soft-shadow">
          <div className="text-xs text-red-400 mb-1">Destructive</div>
          <div className="text-2xl font-bold text-red-700">{stats.deletions}</div>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-4 soft-shadow">
          <div className="text-xs text-amber-400 mb-1">VM Operations</div>
          <div className="text-2xl font-bold text-amber-700">{stats.mutations}</div>
        </div>
        <div className="bg-white border border-blue-200 rounded-2xl p-4 soft-shadow">
          <div className="text-xs text-blue-400 mb-1">Sync Runs</div>
          <div className="text-2xl font-bold text-blue-700">{stats.syncs}</div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl soft-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Audit Logs</h2>
            <p className="text-xs text-slate-400 mt-0.5">Every action on Proxmox infrastructure is tracked</p>
          </div>
          <span className="text-xs text-slate-400">{auditLogs.length} entries</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-6 py-4 text-sm text-red-600">
            <AlertCircle size={16} /> {error}
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            No audit logs yet. Actions will appear here once you interact with Proxmox.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium">Action</th>
                <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium">Resource</th>
                <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium">Result</th>
                <th className="text-left px-6 py-3 text-xs text-slate-500 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.slice(0, 50).map((log, i) => (
                <tr key={log.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${actionStyle(log.action)}`}>
                      {log.action || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                    {log.resource_type}#{log.resource_id}
                  </td>
                  <td className="px-6 py-3">
                    <span className="flex items-center gap-1.5">
                      {resultIcon(log.result)}
                      <span className="text-xs text-slate-500 capitalize">{log.result}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-400 text-xs">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
