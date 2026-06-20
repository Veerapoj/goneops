-- Create database schema for GoneOps

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
