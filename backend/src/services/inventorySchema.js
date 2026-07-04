const { query } = require('../lib/db');

const inventorySchemaSql = `
CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('docker', 'linux_ssh', 'proxmox', 'kubernetes', 'aws', 'azure', 'gcp', 'bare_metal')),
    status VARCHAR(50) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
    config JSONB DEFAULT '{}'::jsonb,
    nodes_count INTEGER DEFAULT 0,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_name UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type);
CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);

CREATE TABLE IF NOT EXISTS hosts (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    hostname VARCHAR(255) NOT NULL,
    host_type VARCHAR(50) DEFAULT 'host' CHECK (host_type IN ('host', 'vm', 'container_host')),
    ip_address VARCHAR(45),
    os_name VARCHAR(100),
    os_version VARCHAR(50),
    kernel_version VARCHAR(100),
    uptime_seconds BIGINT DEFAULT 0,
    cpu_cores INTEGER DEFAULT 0,
    cpu_usage_pct NUMERIC(5,2) DEFAULT 0,
    memory_total_gb NUMERIC(8,2) DEFAULT 0,
    memory_usage_pct NUMERIC(5,2) DEFAULT 0,
    disk_total_gb NUMERIC(10,2) DEFAULT 0,
    disk_usage_pct NUMERIC(5,2) DEFAULT 0,
    os_eol_date DATE,
    status VARCHAR(50) DEFAULT 'unknown' CHECK (status IN ('running', 'stopped', 'unknown', 'decommissioned')),
    owner VARCHAR(255),
    project_name VARCHAR(255),
    environment VARCHAR(50),
    labels JSONB DEFAULT '{}'::jsonb,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_host_provider UNIQUE (hostname, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_hosts_provider ON hosts(provider_id);
CREATE INDEX IF NOT EXISTS idx_hosts_status ON hosts(status);

CREATE TABLE IF NOT EXISTS vms (
    id SERIAL PRIMARY KEY,
    host_id INTEGER REFERENCES hosts(id) ON DELETE SET NULL,
    provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    vmid VARCHAR(100),
    status VARCHAR(50) DEFAULT 'unknown' CHECK (status IN ('running', 'stopped', 'paused', 'unknown')),
    cpu_cores INTEGER DEFAULT 0,
    memory_gb NUMERIC(8,2) DEFAULT 0,
    disk_gb NUMERIC(10,2) DEFAULT 0,
    os_name VARCHAR(100),
    ip_address VARCHAR(45),
    guest_agent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_vm_name_provider UNIQUE (name, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_vms_host ON vms(host_id);
CREATE INDEX IF NOT EXISTS idx_vms_provider ON vms(provider_id);

CREATE TABLE IF NOT EXISTS containers (
    id SERIAL PRIMARY KEY,
    host_id INTEGER REFERENCES hosts(id) ON DELETE SET NULL,
    provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    container_id VARCHAR(128),
    name VARCHAR(255) NOT NULL,
    image VARCHAR(255),
    image_tag VARCHAR(100),
    status VARCHAR(50) DEFAULT 'unknown' CHECK (status IN ('running', 'stopped', 'paused', 'error', 'unknown')),
    ports JSONB DEFAULT '[]'::jsonb,
    volumes JSONB DEFAULT '[]'::jsonb,
    environment_vars JSONB DEFAULT '{}'::jsonb,
    cpu_usage_pct NUMERIC(5,2) DEFAULT 0,
    memory_usage_mb NUMERIC(10,2) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_containers_host ON containers(host_id);
CREATE INDEX IF NOT EXISTS idx_containers_provider ON containers(provider_id);
CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status);

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    owner VARCHAR(255),
    team VARCHAR(255),
    business_unit VARCHAR(255),
    contact_email VARCHAR(255),
    sla_level VARCHAR(50),
    criticality VARCHAR(50) DEFAULT 'medium' CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    cost_center VARCHAR(100),
    status VARCHAR(50) DEFAULT 'unknown' CHECK (status IN ('running', 'stopped', 'unknown', 'decommissioned')),
    description TEXT,
    env_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_applications_project ON applications(project_id);
CREATE INDEX IF NOT EXISTS idx_applications_criticality ON applications(criticality);

CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    domain VARCHAR(255) NOT NULL,
    issuer VARCHAR(255),
    valid_from TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    expires_in_days INTEGER,
    points_to VARCHAR(255),
    service_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'warning' CHECK (status IN ('ok', 'warning', 'critical', 'expired')),
    fingerprint VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_cert_domain UNIQUE (domain)
);
CREATE INDEX IF NOT EXISTS idx_certificates_application ON certificates(application_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);

CREATE TABLE IF NOT EXISTS sync_jobs (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE,
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'warning', 'failed')),
    found_count INTEGER DEFAULT 0,
    removed_count INTEGER DEFAULT 0,
    message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_provider ON sync_jobs(provider_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);

CREATE TABLE IF NOT EXISTS proxmox_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 8006,
    token_user VARCHAR(255) NOT NULL,
    token_id VARCHAR(255) NOT NULL,
    token_secret_encrypted TEXT,
    verify_ssl BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_proxmox_host_token UNIQUE (host, token_id)
);
CREATE INDEX IF NOT EXISTS idx_proxmox_providers_status ON proxmox_providers(status);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    provider_id INTEGER REFERENCES proxmox_providers(id) ON DELETE SET NULL,
    result VARCHAR(50) NOT NULL CHECK (result IN ('success', 'failure')),
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_provider ON audit_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS proxmox_tasks (
    id SERIAL PRIMARY KEY,
    upid TEXT NOT NULL UNIQUE,
    provider_id INTEGER REFERENCES proxmox_providers(id) ON DELETE SET NULL,
    node VARCHAR(255),
    vmid VARCHAR(100),
    type VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'running',
    exit_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_polled_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_proxmox_tasks_provider ON proxmox_tasks(provider_id);
CREATE INDEX IF NOT EXISTS idx_proxmox_tasks_status ON proxmox_tasks(status);

CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    requested_by VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    provider_id INTEGER REFERENCES proxmox_providers(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','failed')),
    approved_by VARCHAR(255),
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_provider ON approval_requests(provider_id);

ALTER TABLE proxmox_providers ADD COLUMN IF NOT EXISTS quota_max_vms INTEGER;

INSERT INTO providers (name, type, status, config, nodes_count) VALUES
    ('Proxmox Cluster A', 'proxmox', 'connected', '{"endpoint":"https://proxmox.example.com:8006","nodes":5}'::jsonb, 5),
    ('Kubernetes Prod', 'kubernetes', 'connected', '{"endpoint":"https://k8s-api.example.com:6443","nodes":3}'::jsonb, 3),
    ('Docker Hosts', 'docker', 'connected', '{"hosts":["docker-01","docker-02","docker-03"]}'::jsonb, 3),
    ('Cloud Console', 'aws', 'disconnected', '{"region":"us-east-1"}'::jsonb, 0)
ON CONFLICT (name) DO NOTHING;

WITH prov AS (SELECT id, name FROM providers)
INSERT INTO hosts (provider_id, hostname, host_type, ip_address, os_name, os_version, cpu_cores, cpu_usage_pct, memory_total_gb, memory_usage_pct, disk_total_gb, disk_usage_pct, status, owner, project_name, environment)
SELECT p.id, h.hostname, h.host_type, h.ip_address, h.os_name, h.os_version, h.cpu_cores, h.cpu_usage_pct, h.memory_total_gb, h.memory_usage_pct, h.disk_total_gb, h.disk_usage_pct, h.status, h.owner, h.project_name, h.environment
FROM prov p, (VALUES
    ('Proxmox Cluster A', 'app01', 'vm', '10.1.1.10', 'Ubuntu', '22.04 LTS', 8, 65.5, 32, 70.2, 100, 45, 'running', 'Infrastructure Team', 'Core Platform', 'Production'),
    ('Proxmox Cluster A', 'db01', 'vm', '10.1.1.20', 'Ubuntu', '22.04 LTS', 16, 45.0, 64, 60.5, 500, 55, 'running', 'Infrastructure Team', 'Core Platform', 'Production'),
    ('Proxmox Cluster A', 'cache01', 'vm', '10.1.1.30', 'Ubuntu', '22.04 LTS', 4, 30.0, 16, 40.0, 50, 20, 'running', 'Infrastructure Team', 'Core Platform', 'Production'),
    ('Docker Hosts', 'docker-01', 'container_host', '10.1.2.10', 'Ubuntu', '24.04 LTS', 32, 55.0, 128, 65.0, 500, 40, 'running', 'Platform Team', 'Container Platform', 'Production'),
    ('Kubernetes Prod', 'k8s-master', 'vm', '10.1.3.10', 'Ubuntu', '22.04 LTS', 8, 42.0, 16, 58.0, 100, 35, 'running', 'Platform Team', 'Kubernetes Cluster', 'Production')
) AS h(provider_name, hostname, host_type, ip_address, os_name, os_version, cpu_cores, cpu_usage_pct, memory_total_gb, memory_usage_pct, disk_total_gb, disk_usage_pct, status, owner, project_name, environment)
WHERE p.name = h.provider_name
AND NOT EXISTS (SELECT 1 FROM hosts WHERE hostname = h.hostname);

WITH h AS (SELECT id, hostname FROM hosts), prov AS (SELECT id, name FROM providers)
INSERT INTO containers (host_id, provider_id, container_id, name, image, image_tag, status, ports, cpu_usage_pct, memory_usage_mb)
SELECT h.id, p.id, c.container_id, c.name, c.image, c.image_tag, c.status, c.ports::jsonb, c.cpu_usage_pct, c.memory_usage_mb
FROM h
JOIN (VALUES
    ('docker-01', 'Docker Hosts', 'abc123', 'payment-api-prod', 'registry.example.com/payment-api', 'v1.4.0', 'running', '[{"host":8080,"container":8080}]', 35.2, 512.5),
    ('docker-01', 'Docker Hosts', 'def456', 'nginx-reverse', 'nginx', '1.25-alpine', 'running', '[{"host":80,"container":80},{"host":443,"container":443}]', 5.1, 64.0),
    ('docker-01', 'Docker Hosts', 'ghi789', 'redis-cache', 'redis', '7.2-alpine', 'running', '[{"host":6379,"container":6379}]', 12.0, 256.0),
    ('k8s-master', 'Kubernetes Prod', 'jkl012', 'frontend-web', 'registry.example.com/frontend', 'v2.1.0', 'running', '[{"host":3000,"container":3000}]', 15.5, 128.0),
    ('docker-01', 'Docker Hosts', 'mno345', 'analytics-worker', 'registry.example.com/analytics', 'v1.0.2', 'stopped', '[]', 0, 0)
) AS c(hostname, provider_name, container_id, name, image, image_tag, status, ports, cpu_usage_pct, memory_usage_mb) ON h.hostname = c.hostname
LEFT JOIN prov p ON p.name = c.provider_name
WHERE NOT EXISTS (SELECT 1 FROM containers WHERE container_id = c.container_id);

INSERT INTO applications (name, owner, team, business_unit, contact_email, sla_level, criticality, cost_center, status, env_count) VALUES
    ('Payment System', 'Digital Team', 'Digital Services', 'Digital Services', 'platform@company.com', '99.9%', 'high', 'CC-2024-001', 'running', 3),
    ('Inventory System', 'Operations Team', 'Platform Operations', 'Operations', 'ops@company.com', '99.5%', 'medium', 'CC-2024-002', 'running', 2),
    ('Analytics Platform', 'Data Team', 'Data Engineering', 'Data & Analytics', 'data@company.com', '95%', 'low', 'CC-2024-003', 'running', 2),
    ('User Portal', 'Frontend Team', 'Web Applications', 'Digital Services', 'web@company.com', '99.9%', 'high', 'CC-2024-004', 'running', 3)
ON CONFLICT (name) DO NOTHING;

WITH cert_seed AS (
    SELECT *
    FROM (VALUES
        ('Payment System', 'api.company.com', 'Let''s Encrypt', CURRENT_TIMESTAMP - INTERVAL '65 days', CURRENT_TIMESTAMP + INTERVAL '25 days', 'LB01', 'payment-api', 'warning'),
        ('User Portal', 'app.company.com', 'Let''s Encrypt', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP + INTERVAL '120 days', 'LB02', 'user-portal', 'ok'),
        ('Analytics Platform', 'admin.company.com', 'DigiCert', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP + INTERVAL '180 days', 'LB03', 'admin-panel', 'ok'),
        (NULL, 'old-api.company.com', 'Self-Signed', CURRENT_TIMESTAMP - INTERVAL '300 days', CURRENT_TIMESTAMP + INTERVAL '5 days', 'Legacy', 'deprecated', 'critical')
    ) AS c(app_name, domain, issuer, valid_from, expires_at, points_to, service_name, status)
)
INSERT INTO certificates (application_id, domain, issuer, valid_from, expires_at, expires_in_days, points_to, service_name, status)
SELECT app.id, c.domain, c.issuer, c.valid_from, c.expires_at, GREATEST(0, EXTRACT(DAY FROM (c.expires_at - CURRENT_TIMESTAMP)))::INTEGER, c.points_to, c.service_name, c.status
FROM cert_seed c
LEFT JOIN applications app ON app.name = c.app_name
WHERE NOT EXISTS (SELECT 1 FROM certificates WHERE domain = c.domain);

WITH prov AS (SELECT id, name FROM providers)
INSERT INTO sync_jobs (provider_id, job_type, status, found_count, removed_count, message, started_at, completed_at)
SELECT p.id, j.job_type, j.status, j.found_count, j.removed_count, j.message, j.started_at, j.completed_at
FROM prov p, (VALUES
    ('Proxmox Cluster A', 'proxmox_sync', 'success', 3, 1, '+3 VM, +10 Container', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours' + INTERVAL '15 minutes'),
    ('Kubernetes Prod', 'kubernetes_sync', 'success', 5, 0, '+5 Pod, +2 Service', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours' + INTERVAL '12 minutes'),
    ('Docker Hosts', 'docker_sync', 'success', 8, 0, '+8 Container', CURRENT_TIMESTAMP - INTERVAL '90 minutes', CURRENT_TIMESTAMP - INTERVAL '90 minutes' + INTERVAL '8 minutes'),
    ('Proxmox Cluster A', 'network_scan', 'warning', 2, 3, '+2 Host, -3 Removed', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours' + INTERVAL '45 minutes')
) AS j(provider_name, job_type, status, found_count, removed_count, message, started_at, completed_at)
WHERE p.name = j.provider_name
AND NOT EXISTS (SELECT 1 FROM sync_jobs sj WHERE sj.provider_id = p.id AND sj.job_type = j.job_type AND sj.message = j.message);
`;

async function ensureInventorySchema() {
  await query(inventorySchemaSql);
}

module.exports = { ensureInventorySchema };
