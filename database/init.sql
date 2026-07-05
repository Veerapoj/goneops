-- Create database schema for GoneOps

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    is_test BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- 2. Environments Table
CREATE TABLE IF NOT EXISTS environments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    resource_prefix VARCHAR(128),
    status VARCHAR(50) DEFAULT 'stopped' CHECK (status IN ('stopped','generating','starting','running','stopping','restarting','failed')),
    preview_url VARCHAR(255),
    working_dir VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lxc_vmid INTEGER,
    lxc_node VARCHAR(255),
    lxc_provider_id INTEGER,
    lxc_ip VARCHAR(45),
    lxc_status VARCHAR(50) DEFAULT 'pending' CHECK (lxc_status IN ('pending','provisioning','ready','error','destroyed')),
    CONSTRAINT unique_project_env UNIQUE (project_id, name),
    CONSTRAINT unique_resource_prefix UNIQUE (resource_prefix)
);
CREATE INDEX IF NOT EXISTS idx_environments_resource_prefix ON environments(resource_prefix);

-- 3. Services Table
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    environment_id INTEGER REFERENCES environments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Node.js', 'PostgreSQL', 'Redis', 'RabbitMQ'
    type VARCHAR(50) NOT NULL, -- e.g., 'runtime', 'database', 'cache', 'queue'
    status VARCHAR(50) DEFAULT 'unhealthy', -- e.g., 'healthy', 'unhealthy'
    port INTEGER NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_environment_service UNIQUE (environment_id, name)
);

-- 4. Deployments Table
CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    environment_id INTEGER REFERENCES environments(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'running', 'success', 'failed'
    logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Pipeline Runs Table
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    environment_id INTEGER REFERENCES environments(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed')),
    duration_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_environment ON pipeline_runs(environment_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_env_created ON pipeline_runs(environment_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_runs_active_once
    ON pipeline_runs(environment_id) WHERE status IN ('pending', 'running');

-- 6. Pipeline Steps Table
CREATE TABLE IF NOT EXISTS pipeline_steps (
    id SERIAL PRIMARY KEY,
    pipeline_run_id INTEGER REFERENCES pipeline_runs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed','skipped')),
    duration_ms INTEGER DEFAULT 0,
    logs TEXT,
    step_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_run_step_order UNIQUE (pipeline_run_id, step_order)
);

-- 7. Secrets Table
CREATE TABLE IF NOT EXISTS secrets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    environment_id INTEGER REFERENCES environments(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_env_secret_key UNIQUE (environment_id, key)
);

-- 8. Sandbox Ports Table
CREATE TABLE IF NOT EXISTS sandbox_ports (
    id SERIAL PRIMARY KEY,
    environment_id INTEGER REFERENCES environments(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('web','db','redis','mq')),
    host_port INTEGER UNIQUE NOT NULL,
    container_port INTEGER NOT NULL DEFAULT 80,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_environment_port_role UNIQUE (environment_id, role)
);
CREATE INDEX IF NOT EXISTS idx_sandbox_ports_env ON sandbox_ports(environment_id);
CREATE INDEX IF NOT EXISTS idx_environments_project ON environments(project_id);
CREATE INDEX IF NOT EXISTS idx_services_environment ON services(environment_id);
CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments(environment_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_project ON pipeline_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_steps_run ON pipeline_steps(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_secrets_project ON secrets(project_id);
CREATE INDEX IF NOT EXISTS idx_secrets_environment ON secrets(environment_id);

-- Seed Demo Data
-- Insert demo project
INSERT INTO projects (name) VALUES ('goneops-demo') ON CONFLICT DO NOTHING;

-- Insert demo environment metadata. It remains stopped until a real sandbox is generated.
INSERT INTO environments (project_id, name, status, preview_url, working_dir)
SELECT id, 'dev', 'stopped', NULL, NULL
FROM projects WHERE name = 'goneops-demo'
ON CONFLICT (project_id, name) DO NOTHING;

-- Insert demo services
INSERT INTO services (environment_id, name, type, status, port, config)
SELECT e.id, 'Node.js Runtime', 'runtime', 'unhealthy', 8080, '{"version":"20-alpine"}'::jsonb
FROM environments e JOIN projects p ON e.project_id = p.id
WHERE p.name = 'goneops-demo' AND e.name = 'dev'
ON CONFLICT DO NOTHING;

INSERT INTO services (environment_id, name, type, status, port, config)
SELECT e.id, 'PostgreSQL Database', 'database', 'unhealthy', 5432, '{"database":"goneops_demo_dev_db","username":"goneops"}'::jsonb
FROM environments e JOIN projects p ON e.project_id = p.id
WHERE p.name = 'goneops-demo' AND e.name = 'dev'
ON CONFLICT DO NOTHING;

INSERT INTO services (environment_id, name, type, status, port, config)
SELECT e.id, 'Redis Cache', 'cache', 'unhealthy', 6379, '{"host":"goneops_demo_dev_redis"}'::jsonb
FROM environments e JOIN projects p ON e.project_id = p.id
WHERE p.name = 'goneops-demo' AND e.name = 'dev'
ON CONFLICT DO NOTHING;

INSERT INTO services (environment_id, name, type, status, port, config)
SELECT e.id, 'RabbitMQ Queue', 'queue', 'unhealthy', 5672, '{"username":"goneops"}'::jsonb
FROM environments e JOIN projects p ON e.project_id = p.id
WHERE p.name = 'goneops-demo' AND e.name = 'dev'
ON CONFLICT DO NOTHING;

-- Insert localhost-only demo secrets. These are plaintext and not production-safe.
INSERT INTO secrets (project_id, environment_id, key, value)
SELECT p.id, e.id, 'DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/goneops_demo_dev_db'
FROM environments e JOIN projects p ON e.project_id = p.id
WHERE p.name = 'goneops-demo' AND e.name = 'dev'
ON CONFLICT (environment_id, key) DO NOTHING;

INSERT INTO secrets (project_id, environment_id, key, value)
SELECT p.id, e.id, 'REDIS_URL', 'redis://localhost:6379'
FROM environments e JOIN projects p ON e.project_id = p.id
WHERE p.name = 'goneops-demo' AND e.name = 'dev'
ON CONFLICT (environment_id, key) DO NOTHING;

INSERT INTO secrets (project_id, environment_id, key, value)
SELECT p.id, e.id, 'RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'
FROM environments e JOIN projects p ON e.project_id = p.id
WHERE p.name = 'goneops-demo' AND e.name = 'dev'
ON CONFLICT (environment_id, key) DO NOTHING;

-- Insert a sample pipeline run for goneops-demo (scoped to dev environment)
WITH new_run AS (
    INSERT INTO pipeline_runs (project_id, environment_id, status, duration_ms)
    SELECT p.id, e.id, 'success', 47320
    FROM projects p
    JOIN environments e ON e.project_id = p.id AND e.name = 'dev'
    WHERE p.name = 'goneops-demo'
      AND NOT EXISTS (
        SELECT 1 FROM pipeline_runs pr
        WHERE pr.project_id = p.id AND pr.environment_id = e.id AND pr.status = 'success' AND pr.duration_ms = 47320
      )
    RETURNING id
)
INSERT INTO pipeline_steps (pipeline_run_id, name, status, duration_ms, logs, step_order)
SELECT
    r.id,
    s.name,
    'success',
    s.duration_ms,
    s.logs,
    s.step_order
FROM new_run r
CROSS JOIN (VALUES
    (1, 'Checkout',     3210,  '[SIMULATED PIPELINE] Repository checkout simulation completed'),
    (2, 'Install',      8740,  '[SIMULATED PIPELINE] Dependency installation simulation completed'),
    (3, 'Lint & Test',  12580, '[SIMULATED PIPELINE] Lint and test simulation completed'),
    (4, 'Build',        15930, '[SIMULATED PIPELINE] Build simulation completed'),
    (5, 'Deploy',       5460,  '[SIMULATED PIPELINE] Deployment simulation completed'),
    (6, 'Smoke Test',   1400,  '[SIMULATED PIPELINE] Smoke-test simulation completed')
) AS s(step_order, name, duration_ms, logs);

-- ============================================================
-- GONEOPS INVENTORY PLATFORM: Phase 1 Schema (Read-Only Visibility)
-- ============================================================

-- 9. Providers Table
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

-- 10. Hosts Table
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

-- 11. VMs Table
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

-- 12. Containers Table
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

-- 13. Applications Table
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

-- 14. Certificates Table
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

-- 15. Sync Jobs Table
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

-- Seed data removed - real infrastructure synced from Proxmox
