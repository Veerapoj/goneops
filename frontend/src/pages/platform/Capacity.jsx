import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Zap, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { fetchCapacity } from '../../api/client';

export default function Capacity() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCapacity();
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

  const capacityData = data?.capacityData || [];
  const idleResources = data?.idleResources || [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Capacity Planning</h1>
        <p className="text-sm text-slate-500 mt-1">Resource utilization and idle detection from synced inventory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {capacityData.length === 0 ? (
          <div className="col-span-full flex items-center justify-center h-32 bg-white border border-slate-200 rounded-2xl">
            <p className="text-sm text-slate-400">No host data available. Sync inventory to populate capacity metrics.</p>
          </div>
        ) : (
          capacityData.map((cap) => {
            const total = cap.total || 1;
            const allocatedPct = Math.min((cap.allocated / total) * 100, 100);
            const usedPct = cap.allocated > 0 ? Math.min((cap.used / cap.allocated) * 100, 100) : 0;
            const waste = Math.max(cap.allocated - cap.used, 0);
            return (
              <div key={cap.resource} className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
                <h3 className="text-base font-semibold text-slate-800 mb-5">{cap.resource} Allocation</h3>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-500">Allocated</span>
                    <span className="font-semibold text-slate-700">{cap.allocated} / {cap.total} {cap.unit}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${allocatedPct}%` }}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-500">Currently Used (Avg)</span>
                    <span className="font-semibold text-slate-700">{cap.used} {cap.unit}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Waste</span>
                  <span className="text-xl font-bold text-red-500">{waste} {cap.unit}</span>
                  <span className="block text-xs text-slate-400 mt-1">Potential cost savings</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
        <h3 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          Idle Resources (&gt; 90 days)
        </h3>
        {idleResources.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">No idle resources detected.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {idleResources.map((resource) => (
              <div key={resource.id || resource.name} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-800 mb-2">{resource.name}</p>
                <p className="text-xs text-slate-500 mb-3">
                  CPU: {resource.cpu} | Mem: {resource.mem}
                </p>
                <button className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer">
                  {resource.action}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-4">Idle resources detected from stopped VMs and containers in inventory.</p>
      </div>
    </div>
  );
}
