import { useState, useEffect } from 'react';
import { HardDrive, ShieldCheck, Loader2, Server, CheckCircle2, Clock } from 'lucide-react';

export default function Operations() {
  const [backups, setBackups] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const certRes = await fetch('/api/platform/certificates');
        const certs = await certRes.json();
        setCertificates(Array.isArray(certs) ? certs : []);

        const vmsRes = await fetch('/api/platform/vms');
        const vmList = await vmsRes.json();
        const vms = Array.isArray(vmList) ? vmList : [];
        const pbsVm = vms.find((v) => (v.name || '').toLowerCase().includes('pbs'));

        const backupData = [];
        if (pbsVm) {
          backupData.push({
            name: 'Proxmox Backup Server',
            vmName: pbsVm.name,
            vmid: pbsVm.vmid,
            status: pbsVm.status === 'running' ? 'Running' : 'Stopped',
            detail: pbsVm.status === 'running' ? 'PBS OS ready for configuration' : 'VM created, install PBS OS to enable backups',
            health: pbsVm.status === 'running' ? 'Good' : 'Pending'
          });
        }
        setBackups(backupData);
      } catch (e) {
        console.error('Failed to load operations data:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-800">Operations</h1>
        <p className="text-sm text-slate-500 mt-1">Backup status, certificates, and operational visibility</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <HardDrive size={18} className="text-slate-500" />
          Backup & Recovery
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 bg-white border border-slate-200 rounded-2xl gap-2">
            <Server size={20} className="text-slate-300" />
            <p className="text-slate-500 text-sm">No backup server VM found in synced Proxmox inventory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {backups.map((b) => (
              <div key={b.name} className={`bg-white border border-slate-200 rounded-2xl p-5 soft-shadow border-l-4 ${
                b.health === 'Good' ? 'border-l-emerald-500' : b.health === 'Warning' ? 'border-l-amber-500' : 'border-l-slate-300'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <Server size={18} className="text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-800">{b.name}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 font-medium block mb-1">VM</span>
                    <span className="text-slate-700 font-mono text-xs">{b.vmName} (vmid: {b.vmid})</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block mb-1">Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                      b.health === 'Good' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {b.health === 'Good' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {b.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block mb-1">Detail</span>
                    <span className="text-slate-600 text-xs">{b.detail}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-slate-500" />
          Certificates & Domains
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
        ) : certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 bg-white border border-slate-200 rounded-2xl gap-2">
            <ShieldCheck size={20} className="text-slate-300" />
            <p className="text-slate-500 text-sm">No certificates tracked yet. Sync Proxmox inventory to discover certificates.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Domain</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issuer</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">{cert.domain}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{cert.issuer || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        cert.status === 'ok' ? 'text-emerald-600' :
                        cert.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          cert.status === 'ok' ? 'bg-emerald-400' : cert.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                        }`} />
                        {cert.status || 'unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-indigo-500">{cert.service_name || cert.application_name || '-'}</td>
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
