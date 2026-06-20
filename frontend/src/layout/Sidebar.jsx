import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  Server,
  Database,
  Lock,
  Settings,
  GitBranch,
  Rocket,
  Box,
  FolderOpen,
  Terminal,
  ScrollText,
  ChevronDown,
  Circle,
  Zap,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

const navGroups = [
  {
    label: 'PROJECT',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
      { to: '/environments', label: 'Environments', icon: Globe },
      { to: '/services', label: 'Services', icon: Server },
      { to: '/databases', label: 'Databases', icon: Database },
      { to: '/secrets', label: 'Secrets', icon: Lock },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'CI/CD',
    items: [
      { to: '/pipelines', label: 'Pipelines', icon: GitBranch },
      { to: '/deployments', label: 'Deployments', icon: Rocket },
    ],
  },
  {
    label: 'SANDBOX',
    items: [
      { to: '/sandbox', label: 'Sandbox', icon: Box },
      { to: '/files', label: 'File Browser', icon: FolderOpen },
      { to: '/terminal', label: 'Terminal', icon: Terminal },
      { to: '/logs', label: 'Logs', icon: ScrollText },
    ],
  },
];

function NavItem({ to, label, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
          isActive
            ? 'bg-gradient-to-r from-blue-600/30 to-blue-500/10 text-white border border-blue-500/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={16}
            className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}
          />
          <span>{label}</span>
          {isActive && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { selectedProject, selectedEnvironment, projects, selectProject, selectEnvironment } = useProject();

  return (
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto"
      style={{ width: 268, background: '#071427' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <span className="text-white font-bold text-[15px] tracking-tight">GoneOps</span>
          <span className="block text-xs text-slate-500 leading-none mt-0.5">Platform</span>
        </div>
      </div>

      {/* Project selector */}
      {selectedProject && (
        <div className="px-4 py-3 border-b border-white/5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">
            Project
          </p>
          <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-left">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-slate-200 text-sm font-medium truncate flex-1">
              {selectedProject.name}
            </span>
            <ChevronDown size={12} className="text-slate-500 shrink-0" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-3 mb-2">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavItem {...item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: Environment status + user */}
      <div className="border-t border-white/5 px-4 py-4 space-y-3">
        {selectedEnvironment ? (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5">
            <Circle
              size={8}
              className="text-emerald-400 fill-emerald-400 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-slate-300 text-xs font-medium truncate">{selectedEnvironment.name}</p>
              <p className="text-slate-600 text-[10px] truncate">
                {selectedEnvironment.status || 'active'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5">
            <Circle size={8} className="text-slate-600 fill-slate-600 shrink-0" />
            <p className="text-slate-600 text-xs">No environment selected</p>
          </div>
        )}

        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            G
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-300 text-xs font-medium truncate">GoneOps</p>
            <p className="text-slate-600 text-[10px] truncate">Admin</p>
          </div>
          <Settings size={13} className="text-slate-600 hover:text-slate-400 cursor-pointer shrink-0" />
        </div>
      </div>
    </aside>
  );
}
