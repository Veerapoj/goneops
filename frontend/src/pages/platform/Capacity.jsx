import { Cpu, HardDrive, Zap, AlertTriangle } from 'lucide-react';

const CAPACITY_DATA = [
  { resource: 'CPU', total: 500, allocated: 400, used: 120, unit: 'Core' },
  { resource: 'Memory', total: 4, allocated: 3.2, used: 1.5, unit: 'TB' },
];

const IDLE_RESOURCES = [
  { name: 'VM-DEV-OLD-01', cpu: '2%', mem: '5%', action: 'Decommission' },
  { name: 'VM-TEST-02', cpu: '1%', mem: '3%', action: 'Shutdown' },
  { name: 'Container-old-api', cpu: '0%', mem: '8%', action: 'Remove' },
];

export default function Capacity() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Capacity Planning</h1>
        <p className="text-sm text-slate-500 mt-1">Resource utilization and idle detection</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {CAPACITY_DATA.map((cap) => {
          const allocatedPct = (cap.allocated / cap.total) * 100;
          const usedPct = (cap.used / cap.allocated) * 100;
          const waste = cap.allocated - cap.used;
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
                <span className="block text-xs text-slate-400 mt-1">Could save ~40% cost</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
        <h3 className="text-base font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          Idle Resources (&gt; 90 days)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {IDLE_RESOURCES.map((resource) => (
            <div key={resource.name} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
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
        <p className="text-xs text-slate-400 mt-4">Resource actions will be available in Phase 5 (Automation).</p>
      </div>
    </div>
  );
}
