import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { fetchProject, fetchServices } from '../api/client';
import { Server, Database, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function CacheServices() {
  const { projectId, envId } = useProject();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId || !envId) return;
    setLoading(true);
    fetchProject(projectId).then(project => {
      const cacheServices = (project.services || []).filter(s => s.type === 'cache' || s.type === 'queue');
      setServices(cacheServices);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [projectId, envId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  if (error) return <div className="p-4 text-red-500 flex items-center gap-2"><AlertCircle size={16} /> {error}</div>;

  const getStatusIcon = (status) => {
    if (status === 'healthy' || status === 'running') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (status === 'unhealthy' || status === 'failed') return <XCircle size={14} className="text-red-500" />;
    return <AlertCircle size={14} className="text-amber-500" />;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Server size={20} className="text-indigo-500" />
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Cache & Queue Services</h2>
          <p className="text-xs text-slate-400">Redis and RabbitMQ runtime status</p>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="text-center p-8 text-slate-400 text-sm">No cache or queue services configured for this environment.</div>
      ) : (
        <div className="grid gap-3">
          {services.map(svc => (
            <div key={svc.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {svc.type === 'cache' ? <Database size={16} className="text-rose-500" /> : <Server size={16} className="text-purple-500" />}
                  <span className="font-semibold text-sm text-slate-700">{svc.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {getStatusIcon(svc.status)}
                  <span className="text-xs text-slate-500 capitalize">{svc.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div><span className="text-slate-400">Type:</span> {svc.type || 'unknown'}</div>
                <div><span className="text-slate-400">Port:</span> {svc.port || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
