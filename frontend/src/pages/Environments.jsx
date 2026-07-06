import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchProject, createEnvironment, runSandbox, stopSandbox } from '../api/client';
import {
  Globe, Plus, Loader2, AlertCircle, CheckCircle2, Circle, X,
  Play, Square, ExternalLink, FolderOpen, Calendar,
} from 'lucide-react';

function statusBadge(status) {
  if (status === 'running' || status === 'active') return 'bg-emerald-50 text-emerald-700';
  if (status === 'error' || status === 'failed') return 'bg-red-50 text-red-700';
  if (status === 'building' || status === 'pending') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-500';
}

function EnvCard({ env, selected, onSelect, projectId, onAction }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const isRunning = env.status === 'running' || env.status === 'active';

  const handleRun = async (e) => {
    e.stopPropagation();
    setActionLoading('run');
    setJobStatus({ step: 'Starting', status: 'running' });
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${env.id}/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GoneOps-Role': 'operator' },
      });
      const data = await res.json();
      if (data.job_id) {
        const poll = setInterval(async () => {
          const jr = await fetch(`/api/projects/${projectId}/environments/${env.id}/jobs`);
          const job = await jr.json();
          if (job.status === 'success' || job.status === 'failed') {
            clearInterval(poll);
            setJobStatus({ step: job.current_step, status: job.status, logs: job.logs });
            setActionLoading(null);
            onAction?.();
          } else {
            setJobStatus({ step: job.current_step, status: 'running' });
          }
        }, 3000);
      } else {
        setActionLoading(null);
        onAction?.();
      }
    } catch (err) {
      setJobStatus({ step: 'Error', status: 'failed', logs: err.message });
      setActionLoading(null);
    }
  };

  const handleStop = async (e) => {
    e.stopPropagation();
    setActionLoading('stop');
    try {
      await stopSandbox(projectId, env.id);
      onAction?.();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      onClick={() => onSelect(env)}
      className={`w-full text-left bg-white rounded-2xl border p-5 soft-shadow transition-all duration-150 hover:border-blue-300 cursor-pointer ${
        selected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Globe size={18} className="text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{env.name}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[140px]">{String(env.id ?? '').slice(0, 16)}…</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusBadge(env.status)}`}>
          <Circle size={6} className="fill-current" />
          {env.status || 'stopped'}
        </span>
      </div>

      {env.working_dir && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
          <FolderOpen size={11} className="shrink-0" />
          <span className="font-mono truncate">{env.working_dir}</span>
        </div>
      )}
      {env.preview_url && (
        <div className="flex items-center gap-1.5 text-xs text-blue-500 mb-1.5">
          <ExternalLink size={11} className="shrink-0" />
          <a href={env.preview_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="truncate hover:underline">{env.preview_url}</a>
        </div>
      )}
      {env.created_at && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <Calendar size={11} className="shrink-0" />
          <span>Created {new Date(env.created_at).toLocaleDateString()}</span>
        </div>
      )}

      {jobStatus && (
        <div className={`mb-3 p-2 rounded-lg text-xs font-mono ${
          jobStatus.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
          jobStatus.status === 'failed' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          <div className="flex items-center gap-1.5">
            {jobStatus.status === 'running' && <Loader2 size={11} className="animate-spin" />}
            {jobStatus.status === 'success' && <CheckCircle2 size={11} />}
            {jobStatus.status === 'failed' && <AlertCircle size={11} />}
            <span className="font-semibold">{jobStatus.step || 'Running...'}</span>
          </div>
          {jobStatus.logs && <div className="mt-1 text-xs opacity-75 truncate">{jobStatus.logs.slice(-100)}</div>}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
        {isRunning ? (
          <button onClick={handleStop} disabled={!!actionLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
            {actionLoading === 'stop' ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />}
            Stop
          </button>
        ) : (
          <button onClick={handleRun} disabled={!!actionLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
            {actionLoading === 'run' ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            Run
          </button>
        )}
        {selected && (
          <span className="flex items-center gap-1 px-2 text-xs text-blue-600 font-medium">
            <CheckCircle2 size={11} /> Active
          </span>
        )}
      </div>
    </div>
  );
}

export default function Environments() {
  const { selectedProjectId, selectedEnvironmentId, selectEnvironment, refresh: refreshCtx } = useProject();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [createError, setCreateError] = useState(null);

  const load = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProject(selectedProjectId);
      setProject(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedProjectId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createEnvironment(selectedProjectId, newName.trim());
      setNewName('');
      setShowForm(false);
      await load();
      await refreshCtx();
    } catch (e) {
      setCreateError(e.response?.data?.error || e.message);
    } finally {
      setCreating(false);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
        <Globe size={36} />
        <p className="font-medium">No project selected</p>
      </div>
    );
  }

  const environments = project?.environments || [];

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Environments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage deployment environments for this project.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Environment
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-slate-200 p-6 soft-shadow flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Create Environment</h2>
            <button type="button" onClick={() => setShowForm(false)}>
              <X size={16} className="text-slate-400 hover:text-slate-600" />
            </button>
          </div>
          <input
            autoFocus
            type="text"
            placeholder="e.g. staging, production"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          {createError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} /> {createError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={18} /> {error}
        </div>
      ) : environments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Globe size={32} />
          <p className="font-medium">No environments yet</p>
          <button onClick={() => setShowForm(true)} className="text-sm text-blue-600 hover:underline">
            Create your first environment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {environments.map((env) => (
            <EnvCard
              key={env.id}
              env={env}
              selected={env.id === selectedEnvironmentId}
              onSelect={(e) => selectEnvironment(e.id)}
              projectId={selectedProjectId}
              onAction={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
