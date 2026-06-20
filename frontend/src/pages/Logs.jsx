import { useState, useEffect, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchLogs } from '../api/client';
import {
  ScrollText, RefreshCw, Loader2, AlertCircle, Pause, Play,
} from 'lucide-react';

export default function Logs() {
  const { selectedProjectId, selectedEnvironmentId } = useProject();
  const [logs, setLogs] = useState('');
  const [logError, setLogError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoPoll, setAutoPoll] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLogs(selectedProjectId, selectedEnvironmentId, 200);
      if (data.logs) {
        setLogs(data.logs);
        setLogError(data.error || '');
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, selectedEnvironmentId]);

  useEffect(() => {
    load();
    if (!autoPoll) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load, autoPoll]);

  if (!selectedProjectId || !selectedEnvironmentId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <ScrollText size={36} />
        <p className="text-lg font-medium text-slate-600">No environment selected</p>
        <p className="text-sm">Select a project and environment to view logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScrollText size={18} className="text-slate-700" />
            <h1 className="text-2xl font-bold text-slate-800">Container Logs</h1>
          </div>
          <p className="text-sm text-slate-500">Live logs from sandbox Docker containers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoPoll(!autoPoll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoPoll ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            {autoPoll ? <Pause size={12} /> : <Play size={12} />}
            {autoPoll ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={load} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      )}

      {loading && !logs && (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      )}

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden soft-shadow">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <span className="ml-2 text-xs text-slate-500 font-mono">container-logs</span>
          <span className="ml-auto text-xs text-slate-600">
            {logs.split('\n').filter(Boolean).length} lines
          </span>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto font-mono text-xs leading-relaxed">
          {logs ? (
            <pre className="text-slate-300 whitespace-pre-wrap break-all">{logs}</pre>
          ) : (
            <p className="text-slate-600 italic">No logs available. Start the sandbox to see container logs.</p>
          )}
          {logError && (
            <p className="mt-2 text-amber-400">{logError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
