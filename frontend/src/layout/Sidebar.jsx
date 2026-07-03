import { useState, useRef, useEffect } from 'react';
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
  ChevronUp,
  Circle,
  Zap,
  Check,
  Plus,
  Layers,
  Monitor,
  Cpu,
  Container,
  Boxes,
  GitGraph,
  Shield,
  Clock,
  HardDrive,
  Network,
  Plug,
  RefreshCw,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { createProject } from '../api/client';

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

function NavItem({ to, label, ariaLabel, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      aria-label={ariaLabel || label}
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
  const { projects, selectedProject, selectedEnvironment, selectProject, selectEnvironment, refresh } = useProject();
  const [open, setOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef(null);
  const envRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
      if (envRef.current && !envRef.current.contains(e.target)) setEnvOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProject(newName.trim());
      setNewName('');
      setOpen(false);
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto"
      style={{ width: 268, background: '#071427' }}
    >
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <span className="text-white font-bold text-[15px] tracking-tight">GoneOps</span>
          <span className="block text-xs text-slate-500 leading-none mt-0.5">Platform</span>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-white/5 relative" ref={dropdownRef}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">
          Project
        </p>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-left"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-slate-200 text-sm font-medium truncate flex-1">
            {selectedProject?.name || 'Select project'}
          </span>
          {open ? (
            <ChevronUp size={12} className="text-slate-500 shrink-0" />
          ) : (
            <ChevronDown size={12} className="text-slate-500 shrink-0" />
          )}
        </button>

        {open && (
          <div className="absolute left-4 right-4 top-[68px] z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { selectProject(p.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-white/5 transition-colors ${
                    selectedProject?.id === p.id ? 'bg-blue-600/20 text-blue-300' : 'text-slate-300'
                  }`}
                >
                  <Circle size={7} className="fill-emerald-400 text-emerald-400 shrink-0" />
                  <span className="truncate flex-1">{p.name}</span>
                  {selectedProject?.id === p.id && <Check size={12} className="text-blue-400 shrink-0" />}
                </button>
              ))}
            </div>
            <form onSubmit={handleCreate} className="border-t border-slate-700 flex items-center gap-1 p-2">
              <input
                type="text"
                placeholder="New project..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 bg-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
              >
                <Plus size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

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

      <div className="border-t border-white/5 px-4 py-4 space-y-3" ref={envRef}>
        <div className="relative">
          <button onClick={() => setEnvOpen(!envOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            {selectedEnvironment ? (
              <>
                <Circle size={8} className="text-emerald-400 fill-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-slate-300 text-xs font-medium truncate">{selectedEnvironment.name}</p>
                  <p className="text-slate-600 text-[10px] truncate">{selectedEnvironment.status || 'active'}</p>
                </div>
              </>
            ) : (
              <>
                <Circle size={8} className="text-slate-600 fill-slate-600 shrink-0" />
                <p className="text-slate-600 text-xs flex-1 text-left">No environment</p>
              </>
            )}
            <ChevronDown size={10} className="text-slate-500 shrink-0" />
          </button>
          {envOpen && selectedProject?.environments?.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-36 overflow-y-auto">
              {selectedProject.environments.map((env) => (
                <button key={env.id}
                  onClick={() => { selectEnvironment(env.id); setEnvOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors ${
                    selectedEnvironment?.id === env.id ? 'bg-blue-600/20 text-blue-300' : 'text-slate-300'
                  }`}>
                  <Circle size={7} className="fill-emerald-400 text-emerald-400 shrink-0" />
                  <span className="truncate flex-1">{env.name}</span>
                  <span className="text-[10px] text-slate-500">{env.status || 'stopped'}</span>
                  {selectedEnvironment?.id === env.id && <Check size={11} className="text-blue-400 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

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
