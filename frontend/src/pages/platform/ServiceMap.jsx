import { useState, useEffect } from 'react';
import { GitGraph, AlertTriangle, ArrowDown, Loader2, RefreshCw } from 'lucide-react';
import { fetchServiceMap } from '../../api/client';

function TreeRow({ indent, name, type, color, spacer }) {
  return (
    <div className={`${spacer ? 'mt-5' : ''} ${color || 'text-slate-600'}`} style={{ paddingLeft: `${indent * 20}px` }}>
      <span className="font-mono text-sm leading-7">
        {indent > 0 && (
          <span className="text-slate-300 mr-1">
            {'\u2502'}
          </span>
        )}
        {indent > 0 && <span className="text-slate-300 mr-1">{'\u2514\u2500'}</span>}
        {name}
        {type && <span className="ml-1.5 text-xs text-slate-400">({type})</span>}
      </span>
    </div>
  );
}

export default function ServiceMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchServiceMap();
        setData(result);
      } catch (e) {
        setError(e.response?.data?.error?.message || e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const dependencyTree = data?.dependencyTree || [];
  const infraTree = data?.infraTree || [];
  const compareRows = data?.compareRows || [];
  const envData = data?.envData || [];
  const hasDrift = compareRows.some((r) => r.drift);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Service Map</h1>
        <p className="text-sm text-slate-500 mt-1">Application-to-infrastructure mapping from synced inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
          <h3 className="text-base font-semibold text-slate-800 mb-6">Application View</h3>
          <div className="space-y-0">
            {dependencyTree.length === 0 ? (
              <p className="text-sm text-slate-400">No containers synced yet. Run a Proxmox inventory sync first.</p>
            ) : (
              dependencyTree.map((item, i) => (
                <TreeRow key={i} {...item} />
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
          <h3 className="text-base font-semibold text-slate-800 mb-6">Infrastructure Mapping</h3>
          <div className="space-y-0">
            {infraTree.length === 0 ? (
              <p className="text-sm text-slate-400">No VMs synced yet. Run a Proxmox inventory sync first.</p>
            ) : (
              infraTree.map((item, i) => (
                <TreeRow key={i} {...item} />
              ))
            )}
          </div>
        </div>
      </div>

      {envData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow mb-8">
          <h3 className="text-base font-semibold text-slate-800 mb-6">Environment Mapping</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {envData.map((envItem) => (
              <div key={envItem.env} className="border-l-4 border-l-indigo-500 pl-4">
                <h4 className="text-sm font-semibold text-indigo-600 mb-3">{envItem.env}</h4>
                {envItem.services.map((svc) => (
                  <div key={svc.name} className="mb-3 text-sm">
                    <div className="flex items-center gap-1 text-slate-600">
                      <ArrowDown size={10} className="text-slate-400 rotate-90" />
                      {svc.name}
                    </div>
                    <div className="ml-5 text-xs text-slate-400">container: {svc.container}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Environment Compare</h2>
        <p className="text-sm text-slate-500 mb-4">Infrastructure inventory overview</p>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden soft-shadow">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-3 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Component</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">DEV</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">UAT</th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-amber-700 uppercase tracking-wider bg-amber-50">PROD</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-slate-400">No data available. Sync inventory to populate.</td>
                </tr>
              ) : (
                compareRows.map((row) => (
                  <tr key={row.component} className="border-b border-slate-100">
                    <td className="py-3 px-4 font-medium text-slate-700">{row.component}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{row.dev}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{row.uat}</td>
                    <td className={`py-3 px-4 text-center ${row.drift ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>
                      {row.prod}
                      {row.drift && <span className="ml-1" title="Drift detected">{'\u26A0\uFE0F'}</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasDrift && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-700 text-sm mb-1">Drift Detected</p>
              <p className="text-xs text-red-600">
                Configuration drift detected across environments. Review and align infrastructure.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
