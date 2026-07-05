import { NavLink, Outlet } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useState } from 'react';
import {
  LayoutDashboard, Plug, RefreshCw, Server, Container, Boxes,
  GitGraph, HardDrive, Cpu, Shield, History, Settings, Globe,
  Copy, ListChecks, Search, Link,
} from 'lucide-react';

const platformNavGroups = [
  {
    label: 'PLATFORM',
    items: [
      { to: '/platform', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'DISCOVERY',
    items: [
      { to: '/platform/providers', label: 'Providers', icon: Plug },
      { to: '/platform/discovery', label: 'Discovery Jobs', icon: RefreshCw },
    ],
  },
  {
    label: 'INVENTORY',
    items: [
      { to: '/platform/inventory', label: 'Hosts', icon: Server },
      { to: '/platform/containers', label: 'Containers', icon: Container },
      { to: '/platform/applications', label: 'Applications', icon: Boxes },
    ],
  },
  {
    label: 'MAPPING',
    items: [
      { to: '/platform/mapping', label: 'Service Map', icon: GitGraph },
      { to: '/platform/explorer', label: 'Runtime Explorer', icon: Search },
      { to: '/platform/unmapped', label: 'Unmapped Assets', icon: Link },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { to: '/platform/operations', label: 'Operations', icon: HardDrive },
      { to: '/platform/capacity', label: 'Capacity', icon: Cpu },
      { to: '/platform/deployments', label: 'Deployments', icon: Globe },
    ],
  },
  {
    label: 'PROXMOX',
    items: [
      { to: '/platform/proxmox/providers', label: 'Providers', icon: Plug },
      { to: '/platform/proxmox/nodes', label: 'Nodes', icon: Server },
      { to: '/platform/proxmox/vms', label: 'Virtual Machines', icon: Cpu },
      { to: '/platform/proxmox/templates', label: 'Templates', icon: Copy },
      { to: '/platform/proxmox/snapshots', label: 'Snapshots', icon: GitGraph },
      { to: '/platform/proxmox/tasks', label: 'Tasks', icon: ListChecks },
      { to: '/platform/proxmox/audit-logs', label: 'Audit Logs', icon: History },
    ],
  },
  {
    label: 'GOVERNANCE',
    items: [
      { to: '/platform/governance', label: 'Audit Logs', icon: Shield },
    ],
  },
];

function PlatformNavItem({ to, label, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`
      }
    >
      <Icon size={16} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function PlatformLayout() {
  const { role, setRole, VALID_ROLES } = useRole();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Platform Sidebar */}
      <aside
        className="flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto"
        style={{ width: 240, background: '#1a1d2e' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/5">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            G
          </div>
          <span className="text-white font-medium text-[15px]">GONEOPS</span>
          <span className="text-gray-500 text-xs ml-auto">Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {platformNavGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 px-3 mb-2">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <PlatformNavItem {...item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/5 px-4 py-4">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 text-sm"
          >
            <Settings size={16} />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-base font-semibold text-gray-800">GoneOps Platform Admin</div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`text-xs rounded-lg border px-2.5 py-1.5 font-medium cursor-pointer outline-none ${
                role === 'admin' ? 'bg-red-50 border-red-200 text-red-700' :
                role === 'operator' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              {VALID_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">Documentation</span>
            <NavLink to="/" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              <Globe size={14} /> DX Dashboard
            </NavLink>
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
