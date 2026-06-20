import { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import {
  generateSandbox, runSandbox, stopSandbox, restartSandbox, testApi,
} from '../api/client';
import {
  Box, Play, Square, RotateCcw, Zap, FlaskConical, Loader2, AlertCircle,
  CheckCircle2, ChevronDown, ChevronUp, Terminal,
} from 'lucide-react';

function ActionButton({ onClick, loading, icon: Icon, label, variant = 'default' }) {
  const variants = {
    default: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${variants[variant]}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
      {label}
    </button>
  );
}

function ResultPanel({ result, label }) {
  const [expanded, setExpanded] = useState(true);
  if (!result) return null;
  const isError = result.type === 'error';
  return (
    <div className={`rounded-xl border ${isError ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'} overflow-hidden`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
      >
        <div className="flex items-center gap-2">
          {isError ? <AlertCircle size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
          {label}
        </div>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <pre className="px-4 pb-4 text-xs font-mono text-slate-600 whitespace-pre-wrap overflow-auto max-h-64">
          {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function Sandbox() {
  const { selectedProjectId, selectedEnvironmentId } = useProject();
  const [results, setResults] = useState({});
  const [loadingAction, setLoadingAction] = useState(null);

  const run = async (actionKey, apiFn) => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setLoadingAction(actionKey);
    try {
      const data = await apiFn(selectedProjectId, selectedEnvironmentId);
      setResults((r) => ({ ...r, [actionKey]: { type: 'success', data } }));
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.message || e.message;
      setResults((r) => ({ ...r, [actionKey]: { type: 'error', data: msg } }));
    } finally {
      setLoadingAction(null);
    }
  };

  const noEnv = !selectedProjectId || !selectedEnvironmentId;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sandbox</h1>
        <p className="text-slate-500 text-sm mt-1">
          Generate, run, and manage your sandbox environment.
        </p>
      </div>

      {noEnv && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertCircle size={16} />
          Please select a project and environment before using the sandbox.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-slate-700 mb-1">Lifecycle Controls</h2>
          <p className="text-xs text-slate-400 mb-4">Generate the sandbox config, then start or stop the environment.</p>
          <div className="flex flex-wrap gap-3">
            <ActionButton
              icon={Zap}
              label="Generate Sandbox"
              variant="primary"
              loading={loadingAction === 'generate'}
              onClick={() => run('generate', generateSandbox)}
            />
            <ActionButton
              icon={Play}
              label="Run"
              variant="success"
              loading={loadingAction === 'run'}
              onClick={() => run('run', runSandbox)}
            />
            <ActionButton
              icon={Square}
              label="Stop"
              variant="danger"
              loading={loadingAction === 'stop'}
              onClick={() => run('stop', stopSandbox)}
            />
            <ActionButton
              icon={RotateCcw}
              label="Restart"
              loading={loadingAction === 'restart'}
              onClick={() => run('restart', restartSandbox)}
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h2 className="font-semibold text-slate-700 mb-1">Testing</h2>
          <p className="text-xs text-slate-400 mb-4">Run a quick API health check against the running sandbox.</p>
          <ActionButton
            icon={FlaskConical}
            label="Test API"
            variant="primary"
            loading={loadingAction === 'test'}
            onClick={() => run('test', testApi)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <ResultPanel result={results['generate']} label="Generate Sandbox Result" />
        <ResultPanel result={results['run']} label="Run Result" />
        <ResultPanel result={results['stop']} label="Stop Result" />
        <ResultPanel result={results['restart']} label="Restart Result" />
        <ResultPanel result={results['test']} label="API Test Result" />
      </div>
    </div>
  );
}
