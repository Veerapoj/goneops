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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_container_provider') THEN
    ALTER TABLE containers ADD CONSTRAINT unique_container_provider UNIQUE (provider_id, container_id);
  END IF;
END $$;

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
`;

async function ensureInventorySchema() {
  await query(inventorySchemaSql);
}

module.exports = { ensureInventorySchema };
