import { useLocation } from 'react-router-dom';
import { Bell, ExternalLink, HelpCircle, ChevronDown } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const routeTitles = {
  '/': 'Overview',
  '/environments': 'Environments',
  '/services': 'Services',
  '/databases': 'Databases',
  '/pipelines': 'Pipelines',
  '/deployments': 'Deployments',
  '/sandbox': 'Sandbox',
  '/files': 'File Browser',
  '/terminal': 'Terminal',
  '/logs': 'Logs',
  '/secrets': 'Secrets',
  '/settings': 'Settings',
  '/platform': 'Platform Overview',
  '/platform/providers': 'Providers',
  '/platform/discovery': 'Discovery Jobs',
  '/platform/inventory': 'Hosts',
  '/platform/containers': 'Containers',
  '/platform/applications': 'Applications',
  '/platform/mapping': 'Service Map',
  '/platform/operations': 'Operations',
  '/platform/capacity': 'Capacity',
  '/platform/governance': 'Governance',
};

export default function Topbar() {
  const { pathname } = useLocation();
  const { selectedProject, selectedEnvironment, selectedProject: proj } = useProject();
  const pageTitle = routeTitles[pathname] || 'GoneOps';

  return (
    <header
      className="sticky top-0 z-30 bg-white border-b border-slate-200 flex items-center px-7 gap-4"
      style={{ height: 72 }}
    >
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-semibold text-slate-800 text-[15px] truncate">
          {selectedProject ? selectedProject.name : 'GoneOps'}
        </span>
        {selectedProject && (
          <>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-slate-500 text-sm truncate">{pageTitle}</span>
          </>
        )}

        {selectedProject && (
          <span className="ml-2 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
            Dev
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {selectedEnvironment && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium truncate max-w-[120px]">{selectedEnvironment.name}</span>
            <ChevronDown size={13} className="text-slate-400" />
          </div>
        )}

        <a
          href="https://docs.goneops.dev"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ExternalLink size={14} />
          <span className="hidden sm:inline">Docs</span>
        </a>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          <HelpCircle size={14} />
          <span className="hidden sm:inline">Support</span>
        </button>

        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 border-2 border-white" />
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold cursor-pointer ml-1">
          G
        </div>
      </div>
    </header>
  );
}
