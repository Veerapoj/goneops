import { Shield, Clock, ScrollText } from 'lucide-react';

export default function Governance() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Governance</h1>
        <p className="text-sm text-slate-500 mt-1">Ownership, lifecycle, and audit tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Shield size={20} className="text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Ownership</h3>
              <p className="text-xs text-slate-400">Application ownership matrix</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Track application owners, teams, and business units. Available in Phase 2.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Lifecycle</h3>
              <p className="text-xs text-slate-400">OS/EOL and version tracking</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Monitor OS versions, EOL dates, and runtime lifecycle status. Available in Phase 3.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <ScrollText size={20} className="text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Audit Logs</h3>
              <p className="text-xs text-slate-400">Change tracking and compliance</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Audit infrastructure changes, deployments, and configuration modifications. Available in Phase 3.
          </p>
        </div>
      </div>
    </div>
  );
}
