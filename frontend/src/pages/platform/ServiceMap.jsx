import { GitGraph, AlertTriangle, ArrowDown } from 'lucide-react';

const DEPENDENCY_TREE = [
  { indent: 0, name: 'nginx', type: 'service' },
  { indent: 1, name: 'payment-api', type: 'service' },
  { indent: 2, name: 'PostgreSQL', type: 'database' },
  { indent: 2, name: 'Redis', type: 'cache' },
  { indent: 0, name: 'frontend-web', type: 'service', spacer: true },
  { indent: 1, name: 'nginx', type: 'service' },
  { indent: 2, name: 'React SPA', type: 'frontend' },
];

const INFRA_TREE = [
  { indent: 0, name: 'payment-api', color: 'text-indigo-500' },
  { indent: 1, name: 'container: xyz123' },
  { indent: 2, name: 'image: payment:v1.2.3' },
  { indent: 2, name: 'VM: app01' },
  { indent: 3, name: 'Proxmox Node01' },
  { indent: 4, name: 'Rack A' },
];

const ENV_DATA = [
  {
    env: 'DEV',
    services: [
      { name: 'Frontend', container: 'frontend-dev01' },
      { name: 'API', container: 'api-dev01' },
      { name: 'Database', container: 'db-dev01' },
    ],
  },
  {
    env: 'UAT',
    services: [
      { name: 'Frontend', container: 'frontend-uat01' },
      { name: 'API', container: 'api-uat01' },
      { name: 'Database', container: 'db-uat01' },
    ],
  },
  {
    env: 'PROD',
    services: [
      { name: 'Frontend', container: 'frontend-prod01' },
      { name: 'API', container: 'api-prod01' },
      { name: 'Database', container: 'db-prod01' },
    ],
  },
];

const COMPARE_ROWS = [
  { component: 'API Version', dev: 'v1.5', uat: 'v1.5', prod: 'v1.4', drift: true },
  { component: 'Database Ver', dev: 'PG 15', uat: 'PG 15', prod: 'PG 14', drift: true },
  { component: 'Redis Ver', dev: '7', uat: '7', prod: '7', drift: false },
  { component: 'Node Count', dev: '2', uat: '3', prod: '3', drift: false },
  { component: 'Memory/Node', dev: '16G', uat: '32G', prod: '32G', drift: false },
];

function TreeRow({ indent, name, type, color, spacer }) {
  return (
    <div className={`${spacer ? 'mt-5' : ''} ${color || 'text-slate-600'}`} style={{ paddingLeft: `${indent * 20}px` }}>
      <span className="font-mono text-sm leading-7">
        {indent > 0 && (
          <span className="text-slate-300 mr-1">
            {indent === 1 ? '\u2502' : '\u2502'}
          </span>
        )}
        {indent > 0 && <span className="text-slate-300 mr-1">{indent > 0 ? '\u2514\u2500' : ''}</span>}
        {name}
        {type && <span className="ml-1.5 text-xs text-slate-400">({type})</span>}
      </span>
    </div>
  );
}

export default function ServiceMap() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-slate-800">Service Map</h1>
        <p className="text-sm text-slate-500 mt-1">Application-to-infrastructure mapping</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
          <h3 className="text-base font-semibold text-slate-800 mb-6">Application View</h3>
          <div className="space-y-0">
            {DEPENDENCY_TREE.map((item, i) => (
              <TreeRow key={i} {...item} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow">
          <h3 className="text-base font-semibold text-slate-800 mb-6">Infrastructure Mapping</h3>
          <div className="space-y-0">
            {INFRA_TREE.map((item, i) => (
              <TreeRow key={i} {...item} />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 soft-shadow mb-8">
        <h3 className="text-base font-semibold text-slate-800 mb-6">Environment Mapping - Payment System</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ENV_DATA.map((envData) => (
            <div key={envData.env} className="border-l-4 border-l-indigo-500 pl-4">
              <h4 className="text-sm font-semibold text-indigo-600 mb-3">{envData.env}</h4>
              {envData.services.map((svc) => (
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

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Environment Compare</h2>
        <p className="text-sm text-slate-500 mb-4">Detect drift between DEV/UAT/PROD</p>

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
              {COMPARE_ROWS.map((row) => (
                <tr key={row.component} className="border-b border-slate-100">
                  <td className="py-3 px-4 font-medium text-slate-700">{row.component}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{row.dev}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{row.uat}</td>
                  <td className={`py-3 px-4 text-center ${row.drift ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>
                    {row.prod}
                    {row.drift && <span className="ml-1" title="Drift detected">\u26A0\uFE0F</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-700 text-sm mb-1">Drift Detected</p>
            <p className="text-xs text-red-600">
              PROD is running API v1.4 while DEV/UAT on v1.5. Recommend upgrade for consistency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
