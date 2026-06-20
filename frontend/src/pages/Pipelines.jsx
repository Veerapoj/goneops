import { useEffect, useState, useCallback, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchPipelines, runPipeline } from '../api/client';
import {
  GitBranch, Play, Loader2, AlertCircle, CheckCircle2,
  XCircle, Clock, RefreshCw, Circle, ChevronDown, ChevronUp, Check,
} from 'lucide-react';

const STEP_NAMES = ['Checkout', 'Install', 'Lint & Test', 'Build', 'Deploy', 'Smoke Test'];

function stepStyle(status) {
  switch (status) {
    case 'success': return { ring: 'border-emerald-400 bg-emerald-50', text: 'text-emerald-600', line: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    case 'running': return { ring: 'border-blue-400 bg-blue-50', text: 'text-blue-600', line: 'bg-blue-400', badge: 'bg-blue-50 text-blue-700 border border-blue-200' };
    case 'failed': return { ring: 'border-red-400 bg-red-50', text: 'text-red-600', line: 'bg-red-300', badge: 'bg-red-50 text-red-600 border border-red-200' };
    default: return { ring: 'border-slate-200 bg-slate-50', text: 'text-slate-400', line: 'bg-slate-200', badge: 'bg-slate-100 text-slate-500 border border-slate-200' };
  }
}

function PipelineVisual({ steps }) {
  const normalized = STEP_NAMES.map((name, i) => ({
    name,
    status: steps?.[i]?.status || 'pending',
    duration: steps?.[i]?.duration_ms ? `${Math.round(steps[i].duration_ms / 1000)}s` : '--',
    logs: steps?.[i]?.logs || '',
  }));

  return (
    <div className="flex items-start gap-0 py-2">
      {normalized.map((step, i) => {
        const c = stepStyle(step.status);
        return (
          <div key={step.name} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 px-1">
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-semibold shrink-0 ${c.ring} ${c.text}`}>
                {step.status === 'success' ? <Check size={13} /> :
                  step.status === 'running' ? <Loader2 size={13} className="animate-spin" /> :
                  step.status === 'failed' ? <XCircle size={12} /> : i + 1}
              </div>
              <span className="text-[10px] text-slate-500 truncate w-full text-center leading-tight font-medium">{step.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${c.badge}`}>{step.duration}</span>
            </div>
            {i < normalized.length - 1 && (
              <div className={`h-0.5 w-6 shrink-0 ${c.line} mt-[-20px]`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PipelineRow({ pipeline, index }) {
  const [expanded, setExpanded] = useState(false);
  const status = pipeline.status?.toLowerCase() || 'unknown';

  const statusIcon = () => {
    if (status === 'success') return <CheckCircle2 size={15} className="text-emerald-500" />;
    if (status === 'failed') return <XCircle size={15} className="text-red-500" />;
    if (status === 'running') return <Loader2 size={15} className="text-blue-500 animate-spin" />;
    return <Clock size={15} className="text-slate-400" />;
  };

  const badgeClass = {
    success: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
    running: 'bg-blue-50 text-blue-700',
    pending: 'bg-amber-50 text-amber-700',
  }[status] || 'bg-slate-100 text-slate-500';

  return (
    <>
      <tr className={`border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${expanded ? 'bg-slate-50/80' : ''}`}
        onClick={() => setExpanded(e => !e)}>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            {statusIcon()}
            <span className="font-medium text-slate-700 text-sm">Run #{index + 1}</span>
            <span className="text-xs text-slate-400 font-mono">{pipeline.id?.slice(0, 8)}</span>
          </div>
        </td>
        <td className="px-5 py-3.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
            {pipeline.status || 'unknown'}
          </span>
        </td>
        <td className="px-5 py-3.5 text-slate-500 text-xs">{pipeline.branch || pipeline.ref || '—'}</td>
        <td className="px-5 py-3.5 text-slate-400 text-xs">
          {pipeline.created_at ? new Date(pipeline.created_at).toLocaleString() : '—'}
        </td>
        <td className="px-5 py-3.5 text-right">
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/80">
          <td colSpan={5} className="px-5 py-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-600 mb-3">Pipeline Steps</p>
              <PipelineVisual steps={pipeline.steps} />
              {pipeline.steps?.some(s => s.logs) && (
                <div className="mt-4 bg-slate-900 rounded-lg p-3 max-h-40 overflow-auto">
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {pipeline.steps.map(s => s.logs).filter(Boolean).join('\n')}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Pipelines() {
  const { selectedProjectId, selectedEnvironmentId } = useProject();
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!selectedProjectId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchPipelines(selectedProjectId);
      const list = Array.isArray(data) ? data : (data.pipelines || []);
      setPipelines(list);
      return list;
    } catch (e) {
      setError(e.response?.data?.error?.message || e.response?.data?.error || e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedProjectId]);

  const startPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const list = await load(true);
      const hasRunning = list?.some(p => p.status === 'running' || p.status === 'pending');
      if (!hasRunning && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 3000);
  }, [load]);

  useEffect(() => {
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const handleRun = async () => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setTriggering(true);
    setTriggerMsg(null);
    try {
      const res = await runPipeline(selectedProjectId, selectedEnvironmentId);
      setTriggerMsg({ type: 'success', text: res.message || 'Pipeline triggered successfully.' });
      await load();
      startPoll();
    } catch (e) {
      setTriggerMsg({ type: 'error', text: e.response?.data?.error?.message || e.response?.data?.error || e.message });
    } finally {
      setTriggering(false);
    }
  };

  const hasRunning = pipelines.some(p => p.status === 'running' || p.status === 'pending');
  const latest = pipelines[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pipelines</h1>
          <p className="text-slate-500 text-sm mt-1">CI/CD pipeline runs for this project.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasRunning && (
            <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full font-medium">
              <Loader2 size={11} className="animate-spin" /> Auto-polling…
            </span>
          )}
          <button onClick={() => load()} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={handleRun} disabled={triggering || !selectedProjectId || !selectedEnvironmentId}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-sm">
            {triggering ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {triggering ? 'Triggering…' : 'Run Pipeline'}
          </button>
        </div>
      </div>

      {triggerMsg && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${
          triggerMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {triggerMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {triggerMsg.text}
          <button onClick={() => setTriggerMsg(null)} className="ml-auto text-current opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Latest pipeline visual */}
      {latest && (
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <GitBranch size={14} className="text-blue-500" /> Latest Run
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono">{latest.id?.slice(0, 8)}</span>
              <span>·</span>
              <span>{latest.created_at ? new Date(latest.created_at).toLocaleString() : '—'}</span>
            </div>
          </div>
          <PipelineVisual steps={latest.steps} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} /> {error}
        </div>
      ) : pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <GitBranch size={32} />
          <p className="font-medium">No pipeline runs yet</p>
          <button onClick={handleRun} disabled={triggering}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50">
            Trigger the first run
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Run History</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Run</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Branch</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Started</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {pipelines.map((p, i) => (
                <PipelineRow key={p.id || i} pipeline={p} index={i} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
