import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, Loader2, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { fetchProxmoxAuditLogs } from '../../../api/client';

export default function ProxmoxAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProxmoxAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
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
        <h1 className="text-[22px] font-semibold text-slate-800">Proxmox Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Audit trail for all Proxmox manager actions</p>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Shield size={28} className="text-slate-300" />
          <p className="text-slate-500 text-sm">No audit logs yet.</p>
          <p className="text-slate-400 text-xs">Logs will appear when providers are created, tested, or synced.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white border border-slate-200 rounded-2xl p-5 soft-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2.5">
                  {log.result === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 capitalize">{log.action.replace(/_/g, ' ')}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{log.actor} - {new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  log.result === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {log.result}
                </span>
              </div>
              {log.message && (
                <p className="text-sm text-slate-600 leading-relaxed">{log.message}</p>
              )}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-400">
                {log.resource_type && <span>Resource: {log.resource_type} #{log.resource_id}</span>}
                {log.provider_id && <span>Provider: #{log.provider_id}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
