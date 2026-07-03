import React, { useState } from 'react';

export default function GoneOpsPlatformAdmin() {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedHost, setExpandedHost] = useState(null);
  const [expandedApp, setExpandedApp] = useState(null);

  const renderOverview = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Platform Overview</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>Complete infrastructure visibility across your organization</p>
      </div>

      {/* Key Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Hosts', value: '128', icon: '🖥️' },
          { label: 'VMs', value: '430', icon: '⚙️' },
          { label: 'Containers', value: '1200', icon: '📦' },
          { label: 'Applications', value: '85', icon: '🚀' },
          { label: 'Environments', value: '240', icon: '🌍' },
          { label: 'Issues', value: '12', icon: '⚠️' }
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>{stat.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#6366f1', marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Connected Providers */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 16px 0' }}>Connected Providers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { name: 'Proxmox', status: 'Connected', count: '220 VM', icon: '🔵' },
            { name: 'Kubernetes', status: 'Connected', count: '86 Pods', icon: '⚓' },
            { name: 'Docker Hosts', status: 'Connected', count: '32 Containers', icon: '🐳' },
            { name: 'Cloud Console', status: 'Disconnected', count: '0', icon: '☁️' }
          ].map((provider) => (
            <div
              key={provider.name}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'border 0.2s',
                borderLeft: provider.status === 'Connected' ? '4px solid #22c55e' : '4px solid #ef4444'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>{provider.icon}</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>{provider.name}</h3>
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: provider.status === 'Connected' ? '#dcfce7' : '#fee2e2',
                color: provider.status === 'Connected' ? '#166534' : '#991b1b',
                marginBottom: '12px'
              }}>
                {provider.status}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#6366f1' }}>{provider.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Resource Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { name: 'CPU Allocation', total: '640 Core', used: '420 Core', percent: 65.6 },
          { name: 'Memory', total: '4 TB', used: '2.8 TB', percent: 70 },
          { name: 'Storage', total: '100 TB', used: '65 TB', percent: 65 }
        ].map((resource) => (
          <div
            key={resource.name}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px'
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '500' }}>{resource.name}</h3>
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${resource.percent}%`,
                  backgroundColor: resource.percent > 80 ? '#ef4444' : '#22c55e',
                  transition: 'width 0.3s'
                }}></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: '#6b7280' }}>Used: {resource.used}</span>
              <span style={{ fontWeight: '500' }}>{Math.round(resource.percent)}%</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total: {resource.total}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderInventory = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Infrastructure Inventory</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>Complete CMDB of your infrastructure</p>
      </div>

      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Hostname</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>IP Address</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>CPU</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Memory</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Services</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { hostname: 'app01', type: 'VM', ip: '10.1.1.10', cpu: '8', mem: '32G', services: ['payment-api', 'nginx'], status: 'Running' },
              { hostname: 'db01', type: 'VM', ip: '10.1.1.20', cpu: '16', mem: '64G', services: ['postgresql'], status: 'Running' },
              { hostname: 'cache01', type: 'VM', ip: '10.1.1.30', cpu: '4', mem: '16G', services: ['redis'], status: 'Running' },
              { hostname: 'docker-01', type: 'Host', ip: '10.1.2.10', cpu: '32', mem: '128G', services: ['12 containers'], status: 'Running' },
              { hostname: 'k8s-master', type: 'VM', ip: '10.1.3.10', cpu: '8', mem: '16G', services: ['kubernetes'], status: 'Running' }
            ].map((host) => (
              <React.Fragment key={host.hostname}>
                <tr
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    backgroundColor: expandedHost === host.hostname ? '#f3f4f6' : 'white'
                  }}
                  onClick={() => setExpandedHost(expandedHost === host.hostname ? null : host.hostname)}
                >
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                    <span style={{ marginRight: '8px' }}>{expandedHost === host.hostname ? '▼' : '▶'}</span>
                    {host.hostname}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{host.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6366f1' }}>{host.ip}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{host.cpu}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{host.mem}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {host.services.slice(0, 2).map((svc) => (
                        <span key={svc} style={{ background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          {svc}
                        </span>
                      ))}
                      {host.services.length > 2 && <span style={{ padding: '2px 8px', fontSize: '11px', color: '#6b7280' }}>+{host.services.length - 2}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: '#22c55e', fontWeight: '500' }}>● {host.status}</span>
                  </td>
                </tr>
                {expandedHost === host.hostname && (
                  <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <td colSpan="7" style={{ padding: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '13px' }}>
                        <div>
                          <div style={{ color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>OS</div>
                          <div>Ubuntu 22.04 LTS</div>
                        </div>
                        <div>
                          <div style={{ color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Owner</div>
                          <div>Infrastructure Team</div>
                        </div>
                        <div>
                          <div style={{ color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Project</div>
                          <div>Core Platform</div>
                        </div>
                        <div>
                          <div style={{ color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Environment</div>
                          <div>Production</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderServiceMap = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Service Map</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>Application-to-infrastructure mapping</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' }}>
        {/* Application View */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', fontWeight: '500' }}>Application View</h3>
          <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8' }}>
            <div>nginx</div>
            <div style={{ marginLeft: '20px' }}>│</div>
            <div style={{ marginLeft: '20px' }}>└─ payment-api</div>
            <div style={{ marginLeft: '40px' }}>│</div>
            <div style={{ marginLeft: '40px' }}>├─ PostgreSQL</div>
            <div style={{ marginLeft: '40px' }}>└─ Redis</div>
            <div style={{ marginTop: '20px' }}>frontend-web</div>
            <div style={{ marginLeft: '20px' }}>│</div>
            <div style={{ marginLeft: '20px' }}>└─ nginx</div>
            <div style={{ marginLeft: '40px' }}>│</div>
            <div style={{ marginLeft: '40px' }}>└─ React SPA</div>
          </div>
        </div>

        {/* Infrastructure Mapping */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', fontWeight: '500' }}>Infrastructure Mapping</h3>
          <div style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.8' }}>
            <div style={{ color: '#6366f1', fontWeight: '500' }}>payment-api</div>
            <div style={{ marginLeft: '20px' }}>│</div>
            <div style={{ marginLeft: '20px' }}>└─ container: xyz123</div>
            <div style={{ marginLeft: '40px' }}>│</div>
            <div style={{ marginLeft: '40px' }}>└─ image: payment:v1.2.3</div>
            <div style={{ marginLeft: '40px' }}>│</div>
            <div style={{ marginLeft: '40px' }}>└─ VM: app01</div>
            <div style={{ marginLeft: '60px' }}>│</div>
            <div style={{ marginLeft: '60px' }}>└─ Proxmox Node01</div>
            <div style={{ marginLeft: '80px' }}>│</div>
            <div style={{ marginLeft: '80px' }}>└─ Rack A</div>
          </div>
        </div>
      </div>

      {/* Environment Mapping */}
      <div style={{ marginTop: '32px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '16px', fontWeight: '500' }}>Environment Mapping - Payment System</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {[
            {
              env: 'DEV',
              services: [
                { name: 'Frontend', container: 'frontend-dev01' },
                { name: 'API', container: 'api-dev01' },
                { name: 'Database', container: 'db-dev01' }
              ]
            },
            {
              env: 'UAT',
              services: [
                { name: 'Frontend', container: 'frontend-uat01' },
                { name: 'API', container: 'api-uat01' },
                { name: 'Database', container: 'db-uat01' }
              ]
            },
            {
              env: 'PROD',
              services: [
                { name: 'Frontend', container: 'frontend-prod01' },
                { name: 'API', container: 'api-prod01' },
                { name: 'Database', container: 'db-prod01' }
              ]
            }
          ].map((envData) => (
            <div key={envData.env} style={{ borderLeft: '4px solid #6366f1', paddingLeft: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#6366f1' }}>{envData.env}</h4>
              {envData.services.map((svc) => (
                <div key={svc.name} style={{ marginBottom: '12px', fontSize: '13px' }}>
                  <div style={{ color: '#6b7280' }}>└ {svc.name}</div>
                  <div style={{ marginLeft: '20px', color: '#9ca3af', fontSize: '12px' }}>container: {svc.container}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProviders = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Providers</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>Manage infrastructure providers and connections</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        {[
          { name: 'Proxmox', nodes: 5, cpu: '70%', ram: '60%' },
          { name: 'Kubernetes', nodes: 3, cpu: '45%', ram: '55%' }
        ].map((provider) => (
          <div key={provider.name} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '500' }}>{provider.name}</h3>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px', fontSize: '13px', color: '#6b7280' }}>
              Connected • {provider.nodes} Nodes
            </div>
            <div style={{ fontSize: '13px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ marginBottom: '4px', fontWeight: '500', color: '#374151' }}>CPU Average</div>
                <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: provider.cpu, backgroundColor: '#f59e0b' }}></div>
                </div>
                <div style={{ textAlign: 'right', marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{provider.cpu}</div>
              </div>
              <div>
                <div style={{ marginBottom: '4px', fontWeight: '500', color: '#374151' }}>Memory Average</div>
                <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: provider.ram, backgroundColor: '#ec4899' }}></div>
                </div>
                <div style={{ textAlign: 'right', marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>{provider.ram}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Provider */}
      <div style={{ marginTop: '32px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '500' }}>Add New Provider</h3>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {['Proxmox', 'Kubernetes', 'Docker', 'AWS', 'Azure', 'Bare Metal'].map((type) => (
            <button
              key={type}
              style={{
                padding: '8px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'border 0.2s'
              }}
            >
              + {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderApplications = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Applications</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>Application dependency mapping and ownership</p>
      </div>

      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Application</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Owner</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Critical</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>SLA</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Environments</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Payment System', owner: 'Digital Team', critical: 'High', sla: '99.9%', envs: ['DEV', 'UAT', 'PROD'] },
              { name: 'Inventory System', owner: 'Operations Team', critical: 'Medium', sla: '99.5%', envs: ['DEV', 'PROD'] },
              { name: 'Analytics Platform', owner: 'Data Team', critical: 'Low', sla: '95%', envs: ['DEV', 'PROD'] },
              { name: 'User Portal', owner: 'Frontend Team', critical: 'High', sla: '99.9%', envs: ['DEV', 'UAT', 'PROD'] }
            ].map((app) => (
              <React.Fragment key={app.name}>
                <tr
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    backgroundColor: expandedApp === app.name ? '#f3f4f6' : 'white'
                  }}
                  onClick={() => setExpandedApp(expandedApp === app.name ? null : app.name)}
                >
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                    <span style={{ marginRight: '8px' }}>{expandedApp === app.name ? '▼' : '▶'}</span>
                    {app.name}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{app.owner}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: app.critical === 'High' ? '#fee2e2' : '#fef3c7',
                      color: app.critical === 'High' ? '#991b1b' : '#92400e'
                    }}>
                      {app.critical}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6366f1', fontWeight: '500' }}>{app.sla}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    {app.envs.map(e => (
                      <span key={e} style={{ marginRight: '8px', padding: '2px 8px', backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '3px', fontSize: '11px' }}>
                        {e}
                      </span>
                    ))}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: '#22c55e', fontWeight: '500' }}>● Running</span>
                  </td>
                </tr>
                {expandedApp === app.name && (
                  <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <td colSpan="6" style={{ padding: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '13px' }}>
                        <div>
                          <div style={{ color: '#6b7280', fontWeight: '500', marginBottom: '8px' }}>Components</div>
                          {['API', 'Frontend', 'Database', 'Cache'].map(c => (
                            <div key={c} style={{ marginBottom: '4px', padding: '4px 8px', backgroundColor: 'white', borderRadius: '3px' }}>
                              ├ {c}
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ color: '#6b7280', fontWeight: '500', marginBottom: '8px' }}>Support Contact</div>
                          <div>Platform Team</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>platform@company.com</div>
                          <div style={{ marginTop: '12px', color: '#6b7280', fontWeight: '500' }}>Business Unit</div>
                          <div>Digital Services</div>
                        </div>
                        <div>
                          <div style={{ color: '#6b7280', fontWeight: '500', marginBottom: '8px' }}>Cost Center</div>
                          <div>CC-2024-001</div>
                          <div style={{ marginTop: '12px', color: '#6b7280', fontWeight: '500' }}>Created</div>
                          <div>Jan 15, 2023</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEnvCompare = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Environment Compare</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>Detect drift between DEV/UAT/PROD</p>
      </div>

      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '500' }}>Payment System</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Component</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>DEV</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>UAT</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', backgroundColor: '#fef3c7' }}>PROD</th>
            </tr>
          </thead>
          <tbody>
            {[
              { component: 'API Version', dev: 'v1.5', uat: 'v1.5', prod: 'v1.4', drift: true },
              { component: 'Database Ver', dev: 'PG 15', uat: 'PG 15', prod: 'PG 14', drift: true },
              { component: 'Redis Ver', dev: '7', uat: '7', prod: '7', drift: false },
              { component: 'Node Count', dev: '2', uat: '3', prod: '3', drift: false },
              { component: 'Memory/Node', dev: '16G', uat: '32G', prod: '32G', drift: false }
            ].map((row) => (
              <tr key={row.component} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', fontWeight: '500' }}>{row.component}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.dev}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{row.uat}</td>
                <td style={{ padding: '12px', textAlign: 'center', backgroundColor: row.drift ? '#fee2e2' : '#f3f4f6' }}>
                  <span style={{ color: row.drift ? '#991b1b' : '#374151' }}>
                    {row.prod} {row.drift && '⚠️'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px' }}>
        <div style={{ color: '#991b1b', fontWeight: '500', marginBottom: '8px' }}>⚠️ Drift Detected</div>
        <div style={{ fontSize: '13px', color: '#7c2d12' }}>
          PROD is running API v1.4 while DEV/UAT on v1.5. Recommend upgrade for consistency.
        </div>
      </div>
    </div>
  );

  const renderBackup = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Backup & Recovery</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>Backup status and recovery testing</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        {[
          { name: 'PostgreSQL Primary', lastBackup: '02:00', status: 'Success', restoreTest: '30 days ago', health: 'Good' },
          { name: 'PostgreSQL Replica', lastBackup: '02:30', status: 'Success', restoreTest: '30 days ago', health: 'Good' },
          { name: 'Redis Cluster', lastBackup: '03:00', status: 'Success', restoreTest: '15 days ago ⚠️', health: 'Warning' },
          { name: 'Application Data', lastBackup: '01:00', status: 'Failed', restoreTest: 'Never tested ⚠️', health: 'Critical' }
        ].map((backup) => (
          <div
            key={backup.name}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              borderLeft: backup.health === 'Critical' ? '4px solid #ef4444' : backup.health === 'Warning' ? '4px solid #f59e0b' : '4px solid #22c55e'
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '500' }}>{backup.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Last Backup</div>
                <div>{backup.lastBackup}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Status</div>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: backup.status === 'Success' ? '#dcfce7' : '#fee2e2',
                  color: backup.status === 'Success' ? '#166534' : '#991b1b'
                }}>
                  {backup.status}
                </span>
              </div>
              <div>
                <div style={{ color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Restore Test</div>
                <div>{backup.restoreTest}</div>
              </div>
              <button style={{
                marginTop: '12px',
                padding: '6px 12px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                Test Restore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCertificates = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Certificates & Domains</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>SSL certificates and domain management</p>
      </div>

      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Domain</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>SSL Cert</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Expires In</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Points To</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Service</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: '#6b7280', fontSize: '13px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { domain: 'api.company.com', cert: 'Let\'s Encrypt', expires: '25 days', pointsTo: 'LB01', service: 'payment-api', status: 'Warning' },
              { domain: 'app.company.com', cert: 'Let\'s Encrypt', expires: '120 days', pointsTo: 'LB02', service: 'user-portal', status: 'OK' },
              { domain: 'admin.company.com', cert: 'DigiCert', expires: '180 days', pointsTo: 'LB03', service: 'admin-panel', status: 'OK' },
              { domain: 'old-api.company.com', cert: 'Self-Signed', expires: '5 days', pointsTo: 'Legacy', service: 'deprecated', status: 'Critical' }
            ].map((cert) => (
              <tr key={cert.domain} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontWeight: '500' }}>{cert.domain}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{cert.cert}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: cert.status === 'Critical' ? '#fee2e2' : cert.status === 'Warning' ? '#fef3c7' : '#dcfce7',
                    color: cert.status === 'Critical' ? '#991b1b' : cert.status === 'Warning' ? '#92400e' : '#166534'
                  }}>
                    {cert.expires}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{cert.pointsTo}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6366f1' }}>{cert.service}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    color: cert.status === 'OK' ? '#22c55e' : cert.status === 'Warning' ? '#f59e0b' : '#ef4444',
                    fontWeight: '500'
                  }}>
                    {cert.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCapacity = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Capacity Planning</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>Resource utilization and idle detection</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px' }}>
        {[
          { resource: 'CPU', total: 500, allocated: 400, used: 120, unit: 'Core' },
          { resource: 'Memory', total: 4, allocated: 3.2, used: 1.5, unit: 'TB' }
        ].map((capacity) => (
          <div key={capacity.resource} style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '500' }}>{capacity.resource} Allocation</h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#6b7280' }}>Allocated</span>
                <span style={{ fontWeight: '500' }}>{capacity.allocated} / {capacity.total} {capacity.unit}</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(capacity.allocated/capacity.total)*100}%`, backgroundColor: '#6366f1' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#6b7280' }}>Currently Used (Avg)</span>
                <span style={{ fontWeight: '500' }}>{capacity.used} {capacity.unit}</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(capacity.used/capacity.allocated)*100}%`, backgroundColor: '#22c55e' }}></div>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '13px' }}>
              <div style={{ color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>Waste</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#ef4444' }}>{capacity.allocated - capacity.used} {capacity.unit}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Could save ~40% cost</div>
            </div>
          </div>
        ))}
      </div>

      {/* Idle Resources */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '500' }}>Idle Resources (> 90 days)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { name: 'VM-DEV-OLD-01', cpu: '2%', mem: '5%', action: 'Decommission' },
            { name: 'VM-TEST-02', cpu: '1%', mem: '3%', action: 'Shutdown' },
            { name: 'Container-old-api', cpu: '0%', mem: '8%', action: 'Remove' }
          ].map((resource) => (
            <div key={resource.name} style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontWeight: '500', marginBottom: '8px', fontSize: '13px' }}>{resource.name}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                CPU: {resource.cpu} | Mem: {resource.mem}
              </div>
              <button style={{ width: '100%', padding: '6px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                {resource.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDiscovery = () => (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px 0' }}>Discovery Jobs</h1>
        <p style={{ color: '#6b7280', margin: '0', fontSize: '14px' }}>Sync infrastructure from providers</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { job: 'Proxmox Sync', lastRun: '10:00', found: ['+3 VM', '+10 Container'], removed: '-1 Removed', status: 'Success' },
          { job: 'Kubernetes Sync', lastRun: '10:15', found: ['+5 Pod', '+2 Service'], removed: '0 Removed', status: 'Success' },
          { job: 'Docker Sync', lastRun: '10:30', found: ['+8 Container'], removed: '+1 New', status: 'Success' },
          { job: 'Network Scan', lastRun: '09:45', found: ['+2 Host'], removed: '-3 Removed', status: 'Warning' }
        ].map((job) => (
          <div
            key={job.job}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: '0', fontSize: '15px', fontWeight: '500' }}>{job.job}</h4>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Last run: {job.lastRun}</div>
              </div>
              <span style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: job.status === 'Success' ? '#dcfce7' : '#fef3c7',
                color: job.status === 'Success' ? '#166534' : '#92400e'
              }}>
                {job.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#6b7280' }}>Found:</span> {job.found.join(', ')}
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Removed:</span> {job.removed}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: '240px',
        backgroundColor: '#1a1d2e',
        color: '#e0e0e0',
        padding: '20px',
        overflowY: 'auto',
        borderRight: '1px solid #2a2d3a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', fontWeight: '500', fontSize: '16px' }}>
          <div style={{ width: '24px', height: '24px', backgroundColor: '#5b5fef', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>G</div>
          <span>GONEOPS</span>
          <span style={{ fontSize: '12px', color: '#7a7a8e', marginLeft: 'auto' }}>Admin</span>
        </div>

        {/* PLATFORM */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#7a7a8e', marginBottom: '12px', letterSpacing: '0.5px' }}>PLATFORM</div>
          <div
            onClick={() => setActiveSection('overview')}
            style={{
              padding: '8px 12px',
              marginBottom: '4px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: activeSection === 'overview' ? '#6366f1' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>🏠</span>
            <span>Overview</span>
          </div>
        </div>

        {/* DISCOVERY */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#7a7a8e', marginBottom: '12px', letterSpacing: '0.5px' }}>DISCOVERY</div>
          {['Providers', 'Discovery'].map((item) => (
            <div
              key={item}
              onClick={() => setActiveSection(item.toLowerCase().replace(' ', '-'))}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: activeSection === item.toLowerCase().replace(' ', '-') ? '#6366f1' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{item === 'Providers' ? '🔌' : '🔄'}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* INVENTORY */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#7a7a8e', marginBottom: '12px', letterSpacing: '0.5px' }}>INVENTORY</div>
          {['Applications', 'Inventory'].map((item) => (
            <div
              key={item}
              onClick={() => setActiveSection(item.toLowerCase().replace(' ', '-'))}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: activeSection === item.toLowerCase().replace(' ', '-') ? '#6366f1' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{item === 'Applications' ? '📦' : '📊'}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* MAPPING */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#7a7a8e', marginBottom: '12px', letterSpacing: '0.5px' }}>MAPPING</div>
          {['Service Map', 'Environment Compare'].map((item) => (
            <div
              key={item}
              onClick={() => setActiveSection(item.toLowerCase().replace(' ', '-'))}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: activeSection === item.toLowerCase().replace(' ', '-') ? '#6366f1' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{item === 'Service Map' ? '🗺️' : '⚖️'}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* OPERATIONS */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#7a7a8e', marginBottom: '12px', letterSpacing: '0.5px' }}>OPERATIONS</div>
          {['Backup', 'Certificates', 'Capacity'].map((item) => (
            <div
              key={item}
              onClick={() => setActiveSection(item.toLowerCase().replace(' ', '-'))}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: activeSection === item.toLowerCase().replace(' ', '-') ? '#6366f1' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{item === 'Backup' ? '💾' : item === 'Certificates' ? '🔐' : '📈'}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* GOVERNANCE */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#7a7a8e', marginBottom: '12px', letterSpacing: '0.5px' }}>GOVERNANCE</div>
          <div
            style={{
              padding: '8px 12px',
              marginBottom: '4px',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#7a7a8e',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>👥</span>
            <span>Audit Logs</span>
          </div>
        </div>

        {/* Settings */}
        <div>
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '24px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '16px'
            }}
          >
            <span>⚙️</span>
            <span>Settings</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Nav */}
        <div style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>GoneOps Platform Admin</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ cursor: 'pointer', fontSize: '14px', color: '#6b7280' }}>Documentation</span>
            <span style={{ fontSize: '20px', cursor: 'pointer' }}>🔔</span>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>A</div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeSection === 'overview' && renderOverview()}
          {activeSection === 'providers' && renderProviders()}
          {activeSection === 'inventory' && renderInventory()}
          {activeSection === 'applications' && renderApplications()}
          {activeSection === 'service-map' && renderServiceMap()}
          {activeSection === 'environment-compare' && renderEnvCompare()}
          {activeSection === 'backup' && renderBackup()}
          {activeSection === 'certificates' && renderCertificates()}
          {activeSection === 'capacity' && renderCapacity()}
          {activeSection === 'discovery' && renderDiscovery()}
        </div>
      </div>
    </div>
  );
}
