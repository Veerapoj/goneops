import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchDatabases, testApi } from '../api/client';
import { Database, Loader2, AlertCircle, Circle, RefreshCw, Copy, Zap, CheckCircle2, XCircle } from 'lucide-react';

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function Databases() {
  const { selectedProjectId, selectedEnvironmentId } = useProject();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const load = async () => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDatabases(selectedProjectId, selectedEnvironmentId);
      setDatabases(Array.isArray(data) ? data : (data.databases || []));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await testApi(selectedProjectId, selectedEnvironmentId);
      const pgResult = res?.body?.results?.pg;
      const ok = res?.status >= 200 && res?.status < 300 && pgResult === 'connected';
      setTestResult({
        ok,
        msg: ok ? 'PostgreSQL connection successful' : (pgResult || res?.body?.error || 'PostgreSQL connection failed'),
      });
    } catch (e) {
      setTestResult({ ok: false, msg: e?.response?.data?.error || e.message });
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedProjectId, selectedEnvironmentId]);

  const typeColor = (type) => {
    const map = {
      postgres: 'bg-blue-50 text-blue-700',
      postgresql: 'bg-blue-50 text-blue-700',
      mysql: 'bg-orange-50 text-orange-700',
      redis: 'bg-red-50 text-red-700',
      mongo: 'bg-green-50 text-green-700',
      mongodb: 'bg-green-50 text-green-700',
      sqlite: 'bg-slate-100 text-slate-600',
    };
    return map[type?.toLowerCase()] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Databases</h1>
          <p className="text-slate-500 text-sm mt-1">Database instances provisioned in this environment.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleTestConnection} disabled={!selectedEnvironmentId || testLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50">
            {testLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Test DB Connection
          </button>
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {testResult && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${
          testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {testResult.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {testResult.msg}
          <button onClick={() => setTestResult(null)} className="ml-auto opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
      )}

      {!selectedEnvironmentId ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Database size={32} />
          <p className="font-medium">Select an environment first</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} /> {error}
        </div>
      ) : databases.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Database size={32} />
          <p className="font-medium">No databases found</p>
          <p className="text-sm">Databases are provisioned automatically when you generate a sandbox.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {databases.map((db, i) => (
            <div key={db.id || i} className="bg-white rounded-2xl border border-slate-200 soft-shadow p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Database size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{db.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor(db.type)}`}>
                      {db.type || 'unknown'}
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  db.status === 'running' || db.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <Circle size={6} className="fill-current" />
                  {db.status || 'unknown'}
                </span>
              </div>

              {db.connection_string_masked && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1 font-medium">Connection String</p>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <code className="text-xs text-slate-600 flex-1 truncate font-mono">
                      {db.connection_string_masked}
                    </code>
                    <button
                      onClick={() => copyToClipboard(db.connection_string_masked)}
                      className="shrink-0 text-slate-400 hover:text-slate-600"
                      aria-label="Copy masked connection string"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                {db.host && <div><span className="font-medium text-slate-600">Host:</span> {db.host}</div>}
                {db.port && <div><span className="font-medium text-slate-600">Port:</span> {db.port}</div>}
                {db.database && <div><span className="font-medium text-slate-600">DB:</span> {db.database}</div>}
                {db.username && <div><span className="font-medium text-slate-600">User:</span> {db.username}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
