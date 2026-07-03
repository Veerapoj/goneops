import { useState, useEffect, useCallback } from 'react';
import { HardDrive, ShieldCheck, AlertTriangle, Loader2, RefreshCw, Clock } from 'lucide-react';
import { fetchCertificates } from '../../api/client';

const BACKUPS = [
  { name: 'PostgreSQL Primary', lastBackup: '02:00', status: 'Success', restoreTest: '30 days ago', health: 'Good' },
  { name: 'PostgreSQL Replica', lastBackup: '02:30', status: 'Success', restoreTest: '30 days ago', health: 'Good' },
  { name: 'Redis Cluster', lastBackup: '03:00', status: 'Success', restoreTest: '15 days ago', health: 'Warning' },
  { name: 'Application Data', lastBackup: '01:00', status: 'Failed', restoreTest: 'Never tested', health: 'Critical' },
];

function BackupCard({ backup }) {
  const healthColor = {
    Good: 'border-l-emerald-500',
    Warning: 'border-l-amber-500',
    Critical: 'border-l-red-500',
  }[backup.health] || 'border-l-slate-300';

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-5 soft-shadow border-l-4 ${healthColor}`}>
      <h3 className="text-sm font-semibold text-slate-800 mb-4">{backup.name}</h3>
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-xs text-slate-500 font-medium block mb-1">Last Backup</span>
          <span className="text-slate-700">{backup.lastBackup}</span>
        </div>
        <div>
          <span className="text-xs text-slate-500 font-medium block mb-1">Status</span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            backup.status === 'Success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {backup.status}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 font-medium block mb-1">Restore Test</span>
          <span className={`text-sm ${backup.health === 'Critical' ? 'text-red-600' : backup.health === 'Warning' ? 'text-amber-600' : 'text-slate-600'}`}>
            {backup.restoreTest}
            {backup.health === 'Warning' && <span className="ml-1">\u26A0\uFE0F</span>}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Operations() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCertificates();
      setCertificates(data);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Operations</h1>
        <p className="text-sm text-slate-500 mt-1">Backup status, certificates, and operational visibility</p>
      </div>

      <div className="mb-10">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <HardDrive size={18} className="text-slate-500" />
          Backup & Recovery
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {BACKUPS.map((backup) => (
            <BackupCard key={backup.name} backup={backup} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-slate-500" />
          Certificates & Domains
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="text-slate-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <AlertTriangle size={20} className="text-red-400" />
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <ShieldCheck size={20} className="text-slate-300" />
            <p className="text-slate-500 text-sm">No certificates tracked yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Domain</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SSL Cert</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expires In</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Points To</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">{cert.domain}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{cert.issuer || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        cert.status === 'critical' || cert.status === 'expired' ? 'bg-red-50 text-red-700' :
                        cert.status === 'warning' ? 'bg-amber-50 text-amber-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {cert.expires_in_days != null ? `${cert.expires_in_days} days` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{cert.points_to || '-'}</td>
                    <td className="py-3 px-4 text-sm text-indigo-500">{cert.service_name || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        cert.status === 'ok' ? 'text-emerald-600' :
                        cert.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          cert.status === 'ok' ? 'bg-emerald-400' :
                          cert.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                        }`} />
                        {cert.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
