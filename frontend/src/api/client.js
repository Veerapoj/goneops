import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchProjects() {
  const { data } = await client.get('/projects');
  return data;
}

export async function fetchProject(id) {
  const { data } = await client.get(`/projects/${id}`);
  return data;
}

export async function createProject(name) {
  const { data } = await client.post('/projects', { name });
  return data;
}

export async function createEnvironment(projectId, name) {
  const { data } = await client.post(`/projects/${projectId}/environments`, { name });
  return data;
}

export async function generateSandbox(projectId, environmentId) {
  const { data } = await client.post(`/projects/${projectId}/generate-sandbox`, { environment_id: environmentId });
  return data;
}

export async function runSandbox(projectId, environmentId) {
  const { data } = await client.post(`/projects/${projectId}/run`, { environment_id: environmentId });
  return data;
}

export async function stopSandbox(projectId, environmentId) {
  const { data } = await client.post(`/projects/${projectId}/stop`, { environment_id: environmentId });
  return data;
}

export async function restartSandbox(projectId, environmentId) {
  const { data } = await client.post(`/projects/${projectId}/restart`, { environment_id: environmentId });
  return data;
}

export async function testApi(projectId, environmentId) {
  const { data } = await client.post(`/projects/${projectId}/test-api`, { environment_id: environmentId });
  return data;
}

export async function fetchFiles(projectId, environmentId) {
  const { data } = await client.get(`/projects/${projectId}/files`, { params: { environment_id: environmentId } });
  return data;
}

export async function fetchFileContent(projectId, environmentId, filePath) {
  const { data } = await client.get(`/projects/${projectId}/files/content`, {
    params: { environment_id: environmentId, file_path: filePath },
  });
  return data;
}

export async function fetchLogs(projectId, environmentId, tail = 100) {
  const { data } = await client.get(`/projects/${projectId}/logs`, {
    params: { environment_id: environmentId, tail },
  });
  return data;
}

export async function fetchPipelines(projectId, environmentId) {
  const { data } = await client.get(`/projects/${projectId}/pipelines`, { params: { environment_id: environmentId } });
  return data;
}

export async function runPipeline(projectId, environmentId) {
  const { data } = await client.post(`/projects/${projectId}/pipelines/run`, { environment_id: environmentId });
  return data;
}

export async function fetchSecrets(projectId, environmentId) {
  const { data } = await client.get(`/projects/${projectId}/secrets`, {
    params: { environment_id: environmentId },
  });
  return data;
}

export async function upsertSecret(projectId, environmentId, key, value) {
  const { data } = await client.post(`/projects/${projectId}/secrets`, {
    environment_id: environmentId,
    key,
    value,
  });
  return data;
}

export async function deleteSecret(projectId, environmentId, key) {
  const { data } = await client.delete(`/projects/${projectId}/secrets/${key}`, {
    params: { environment_id: environmentId },
  });
  return data;
}

export async function fetchDeployments(projectId, environmentId) {
  const { data } = await client.get(`/projects/${projectId}/deployments`, {
    params: { environment_id: environmentId },
  });
  return data;
}

export async function fetchServices(projectId, environmentId) {
  const { data } = await client.get(`/projects/${projectId}/services`, {
    params: { environment_id: environmentId },
  });
  return data;
}

export async function createService(projectId, environmentId, name, type, port) {
  const { data } = await client.post(`/projects/${projectId}/services`, {
    environment_id: environmentId, name, type, port,
  });
  return data;
}

export async function fetchDatabases(projectId, environmentId) {
  const { data } = await client.get(`/projects/${projectId}/databases`, {
    params: { environment_id: environmentId },
  });
  return data;
}

export default client;
