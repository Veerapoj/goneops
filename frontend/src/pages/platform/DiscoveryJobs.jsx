import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2 } from 'lucide-react';
import { fetchSyncJobs } from '../../api/client';

function StatusBadge({ status }) {
  const config = {
    success: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, color: 'text-emerald-500' },
    warning: { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle, color: 'text-amber-500' },
    failed: { bg: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, color: 'text-red-500' },
    running: { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: RefreshCw, color: 'text-blue-500' },
    pending: { bg: 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock, color: 'text-slate-500' },
  };
  const { bg, icon: Icon, color } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${bg}`}>
      <Icon size={12} className={color} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function DiscoveryJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSyncJobs();
      setJobs(data);
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
        <h1 className="text-[22px] font-semibold text-slate-800">Discovery Jobs</h1>
        <p className="text-sm text-slate-500 mt-1">Sync infrastructure from providers</p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <RefreshCw size={28} className="text-slate-300" />
          <p className="text-slate-500 text-sm">No sync jobs yet.</p>
          <p className="text-slate-400 text-xs">Discovery will be available in Phase 2.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white border border-slate-200 rounded-2xl p-5 soft-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{job.provider_name} - {job.job_type}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Last run: {job.started_at ? new Date(job.started_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-slate-500">Found:</span>{' '}
                  <span className="font-medium text-emerald-600">+{job.found_count}</span>
                </div>
                <div>
                  <span className="text-slate-500">Removed:</span>{' '}
                  <span className={`font-medium ${job.removed_count > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {job.removed_count > 0 ? `-${job.removed_count}` : '0'}
                  </span>
                </div>
              </div>
              {job.message && (
                <p className="text-xs text-slate-400 mt-2">{job.message}</p>
              )}
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                <span>Provider: {job.provider_type || 'N/A'}</span>
                {job.completed_at && (
                  <span>Completed: {new Date(job.completed_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
