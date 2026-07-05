const { request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const api = await request.newContext({
    baseURL: process.env.GONEOPS_API_URL || 'http://localhost:14000',
  });

  const health = await api.get('/api/health');
  if (!health.ok()) {
    throw new Error(`GoneOps API is unavailable: ${health.status()} ${await health.text()}`);
  }

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const projectName = `e2e-${suffix}`;
  const projectResponse = await api.post('/api/projects', { data: { name: projectName, is_test: true } });
  if (projectResponse.status() !== 201) {
    throw new Error(`Unable to create E2E project: ${projectResponse.status()} ${await projectResponse.text()}`);
  }
  const project = await projectResponse.json();

  const environmentResponse = await api.post(`/api/projects/${project.id}/environments`, {
    data: { name: 'dev' },
  });
  if (environmentResponse.status() !== 201) {
    throw new Error(`Unable to create E2E environment: ${environmentResponse.status()} ${await environmentResponse.text()}`);
  }
  const environment = await environmentResponse.json();

  const roleHeaders = { 'X-GoneOps-Role': 'operator' };

  const sandboxResponse = await api.post(`/api/projects/${project.id}/generate-sandbox`, {
    headers: roleHeaders,
    data: { environment_id: environment.id },
  });
  if (!sandboxResponse.ok()) {
    throw new Error(`Unable to generate E2E sandbox: ${sandboxResponse.status()} ${await sandboxResponse.text()}`);
  }

  const pipelineResponse = await api.post(`/api/projects/${project.id}/pipelines/run`, {
    data: { environment_id: environment.id },
  });
  if (![202, 409].includes(pipelineResponse.status())) {
    throw new Error(`Unable to seed pipeline: ${pipelineResponse.status()} ${await pipelineResponse.text()}`);
  }

  const fixture = { project, environment, projectName };
  fs.mkdirSync(__dirname, { recursive: true });
  fs.writeFileSync(path.join(__dirname, '.fixture.json'), JSON.stringify(fixture, null, 2));
  await api.dispose();
};
