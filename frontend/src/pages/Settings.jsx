import { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { createProject } from '../api/client';
import { Settings as SettingsIcon, Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

function Section({ title, description, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <h2 className="font-semibold text-slate-700">{title}</h2>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { projects, selectedProject, selectedProjectId, selectProject, refresh } = useProject();
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(false);
    try {
      const proj = await createProject(newProjectName.trim());
      setNewProjectName('');
      setCreateSuccess(true);
      await refresh();
      if (proj?.id) selectProject(proj.id);
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err) {
      setCreateError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage projects and platform configuration.</p>
      </div>

      <Section title="Current Project" description="Details about the selected project.">
        {selectedProject ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <SettingsIcon size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{selectedProject.name}</p>
                <p className="text-xs text-slate-400 font-mono">{selectedProject.id}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Environments</p>
                <p className="text-sm font-semibold text-slate-700">
                  {selectedProject.environments?.length ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Created</p>
                <p className="text-sm text-slate-700">
                  {selectedProject.created_at
                    ? new Date(selectedProject.created_at).toLocaleDateString()
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No project selected.</p>
        )}
      </Section>

      <Section title="All Projects" description="Switch between or create projects.">
        <div className="space-y-2 mb-5">
          {projects.length === 0 ? (
            <p className="text-sm text-slate-400">No projects yet.</p>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProject(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  p.id === selectedProjectId
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    p.id === selectedProjectId ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-700 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400 font-mono truncate">{p.id}</p>
                </div>
                {p.id === selectedProjectId && (
                  <span className="text-xs font-medium text-blue-600 shrink-0">Active</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Create New Project</h3>
          <form onSubmit={handleCreateProject} className="flex gap-3">
            <input
              type="text"
              placeholder="my-new-project"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={creating || !newProjectName.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
          {createError && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} /> {createError}
            </p>
          )}
          {createSuccess && (
            <p className="mt-2 text-sm text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Project created and selected.
            </p>
          )}
        </div>
      </Section>

      <Section title="Platform" description="GoneOps version and API information.">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Frontend Version</p>
            <p className="text-slate-700 font-mono">1.0.0</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">API Endpoint</p>
            <p className="text-slate-700 font-mono">/api</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
