import { useState, useEffect, useCallback } from 'react';
import { Boxes, ChevronDown, ChevronRight, AlertTriangle, Loader2, RefreshCw, Users } from 'lucide-react';
import { fetchApplications } from '../../api/client';

function CriticalityBadge({ level }) {
  const config = {
    critical: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${config[level] || config.low}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApplications();
      setApps(data);
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
        <h1 className="text-[22px] font-semibold text-slate-800">Applications</h1>
        <p className="text-sm text-slate-500 mt-1">Application dependency mapping and ownership</p>
      </div>

      {apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Boxes size={28} className="text-slate-300" />
          <p className="text-slate-500 text-sm">No applications registered yet.</p>
          <p className="text-slate-400 text-xs">Application mapping will be available in Phase 2.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Application</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SLA</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Envs</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => {
                const isExpanded = expanded === app.id;
                return (
                  <tr key={app.id} className="border-b border-slate-100">
                    <td colSpan={6} className="p-0">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : app.id)}
                        className="w-full flex items-center py-3 px-4 text-left text-sm hover:bg-slate-50 transition-colors"
                      >
                        <span className="mr-2 text-slate-400">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                        <span className="font-medium text-slate-800">{app.name}</span>
                        <span className="ml-auto mr-6 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Users size={12} /> {app.owner || '-'}
                          </span>
                        </span>
                        <span className="mr-6"><CriticalityBadge level={app.criticality || 'low'} /></span>
                        <span className="mr-6 text-sm font-medium text-indigo-600">{app.sla_level || '-'}</span>
                        <span className="mr-6 text-sm text-slate-600">{app.env_count || 0}</span>
                        <span className="mr-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                            app.status === 'running' ? 'text-emerald-600' : 'text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'running' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                            {app.status || 'unknown'}
                          </span>
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-xs text-slate-500 font-medium">Business Unit</span>
                              <p className="text-slate-700">{app.business_unit || '-'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500 font-medium">Contact</span>
                              <p className="text-slate-700">{app.contact_email || '-'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500 font-medium">Team</span>
                              <p className="text-slate-700">{app.team || '-'}</p>
                            </div>
                            <div>
                              <span className="text-xs text-slate-500 font-medium">Cost Center</span>
                              <p className="text-slate-700">{app.cost_center || '-'}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-xs text-slate-500 font-medium">Project</span>
                              <p className="text-slate-700">{app.project_name || '-'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
