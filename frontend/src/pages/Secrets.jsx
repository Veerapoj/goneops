import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchSecrets, upsertSecret, deleteSecret } from '../api/client';
import {
  Lock, Plus, Loader2, AlertCircle, Trash2, CheckCircle2, X, Save,
} from 'lucide-react';

function SecretRow({ secret, onDelete, onEdit }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete secret "${secret.key}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(secret.key);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50 group transition-colors">
      <td className="px-6 py-4 font-mono text-sm font-medium text-slate-700">{secret.key}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-slate-500">
            {secret.value || '••••••••••••'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-400 text-xs">
        {secret.updated_at ? new Date(secret.updated_at).toLocaleString() : '—'}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(secret)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Save size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Secrets() {
  const { selectedProjectId, selectedEnvironmentId } = useProject();
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const load = async () => {
    if (!selectedProjectId || !selectedEnvironmentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSecrets(selectedProjectId, selectedEnvironmentId);
      setSecrets(Array.isArray(data) ? data : (data.secrets || []));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedProjectId, selectedEnvironmentId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formKey.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await upsertSecret(selectedProjectId, selectedEnvironmentId, formKey.trim(), formValue);
      setFormKey('');
      setFormValue('');
      setShowForm(false);
      await load();
    } catch (e) {
      setSaveError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key) => {
    await deleteSecret(selectedProjectId, selectedEnvironmentId, key);
    await load();
  };

  const handleEdit = (secret) => {
    setFormKey(secret.key);
    setFormValue('');
    setShowForm(true);
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Secrets</h1>
          <p className="text-slate-500 text-sm mt-1">Environment variables and secrets for this environment.</p>
        </div>
        <button
          onClick={() => { setFormKey(''); setFormValue(''); setShowForm(true); }}
          disabled={!selectedEnvironmentId}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          Add Secret
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-slate-200 p-6 soft-shadow space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">
              {formKey && secrets.find((s) => s.key === formKey) ? 'Edit Secret' : 'New Secret'}
            </h2>
            <button type="button" onClick={() => setShowForm(false)}>
              <X size={16} className="text-slate-400 hover:text-slate-600" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="secret-key" className="block text-xs font-medium text-slate-500 mb-1.5">Key</label>
              <input
                id="secret-key"
                autoFocus
                type="text"
                placeholder="DATABASE_URL"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="secret-value" className="block text-xs font-medium text-slate-500 mb-1.5">Value</label>
              <input
                id="secret-value"
                type="text"
                placeholder="secret value"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>
          {saveError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} /> {saveError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !formKey.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Saving…' : 'Save'}
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

      {!selectedEnvironmentId ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Lock size={32} />
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
      ) : secrets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 text-slate-400 gap-3">
          <Lock size={32} />
          <p className="font-medium">No secrets yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Add your first secret
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 soft-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Key</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Value</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium">Last Updated</th>
                <th className="text-left px-6 py-3 text-slate-500 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {secrets.map((s) => (
                <SecretRow
                  key={s.key}
                  secret={s}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
