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

export async function fetchPlatformDashboard() {
  const { data } = await client.get('/platform/dashboard');
  return data;
}

export async function fetchProviders() {
  const { data } = await client.get('/platform/providers');
  return data;
}

export async function fetchHosts() {
  const { data } = await client.get('/platform/hosts');
  return data;
}

export async function fetchContainers() {
  const { data } = await client.get('/platform/containers');
  return data;
}

export async function fetchApplications() {
  const { data } = await client.get('/platform/applications');
  return data;
}

export async function fetchCertificates() {
  const { data } = await client.get('/platform/certificates');
  return data;
}

export async function fetchSyncJobs() {
  const { data } = await client.get('/platform/sync-jobs');
  return data;
}

export async function fetchProxmoxProviders() {
  const { data } = await client.get('/proxmox/providers');
  return data;
}

export async function createProxmoxProvider(provider) {
  const { data } = await client.post('/proxmox/providers', provider);
  return data;
}

export async function testProxmoxProvider(id) {
  const { data } = await client.post(`/proxmox/providers/${id}/test`);
  return data;
}

export async function fetchProxmoxNodes(id) {
  const { data } = await client.get(`/proxmox/providers/${id}/nodes`);
  return data;
}

export async function fetchProxmoxVMs(id) {
  const { data } = await client.get(`/proxmox/providers/${id}/vms`);
  return data;
}

export async function fetchProxmoxVM(providerId, vmid) {
  const { data } = await client.get(`/proxmox/vms/${vmid}`, { params: { provider_id: providerId } });
  return data;
}

export async function syncProxmoxInventory(providerId) {
  const { data } = await client.post('/proxmox/sync-inventory', { provider_id: providerId });
  return data;
}

export async function fetchProxmoxAuditLogs(limit) {
  const { data } = await client.get('/proxmox/audit-logs', { params: { limit } });
  return data;
}

function getRoleHeaders() {
  const role = localStorage.getItem('goneops-role') || 'operator';
  const actor = localStorage.getItem('goneops-actor') || role;
  return {
    'X-GoneOps-Role': role,
    'X-GoneOps-Actor': actor,
  };
}

export function setRole(role) {
  localStorage.setItem('goneops-role', role);
}

export function getStoredRole() {
  return localStorage.getItem('goneops-role') || 'operator';
}

export async function startVM(providerId, vmid) {
  const { data } = await client.post(`/proxmox/vms/${vmid}/start`, { provider_id: providerId }, { headers: getRoleHeaders() });
  return data;
}

export async function stopVM(providerId, vmid) {
  const { data } = await client.post(`/proxmox/vms/${vmid}/stop`, { provider_id: providerId }, { headers: getRoleHeaders() });
  return data;
}

export async function rebootVM(providerId, vmid) {
  const { data } = await client.post(`/proxmox/vms/${vmid}/reboot`, { provider_id: providerId }, { headers: getRoleHeaders() });
  return data;
}

export async function fetchTaskStatus(providerId, upid) {
  const { data } = await client.get(`/proxmox/tasks/${encodeURIComponent(upid)}`, { params: { provider_id: providerId } });
  return data;
}

export async function fetchTasks(limit) {
  const { data } = await client.get('/proxmox/tasks', { params: { limit } });
  return data;
}

export async function fetchTemplates(providerId) {
  const { data } = await client.get(`/proxmox/providers/${providerId}/templates`);
  return data;
}

export async function cloneTemplate(providerId, templateVmid, { name, target_node }) {
  const { data } = await client.post(`/proxmox/templates/${templateVmid}/clone`, { provider_id: providerId, name, target_node }, { headers: getRoleHeaders() });
  return data;
}

export async function createSnapshot(providerId, vmid, { snapname, description }) {
  const { data } = await client.post(`/proxmox/vms/${vmid}/snapshot`, { provider_id: providerId, snapname, description }, { headers: getRoleHeaders() });
  return data;
}

export async function fetchSnapshots(providerId, vmid) {
  const { data } = await client.get(`/proxmox/vms/${vmid}/snapshots`, { params: { provider_id: providerId } });
  return data;
}

export async function rollbackSnapshot(providerId, vmid, snapname) {
  const { data } = await client.post(`/proxmox/vms/${vmid}/rollback`, { provider_id: providerId, snapname }, { headers: getRoleHeaders() });
  return data;
}

export async function listApprovals() {
  const { data } = await client.get('/proxmox/approvals');
  return data;
}

export async function approveRequest(id) {
  const { data } = await client.post(`/proxmox/approvals/${id}/approve`, {}, { headers: getRoleHeaders() });
  return data;
}

export async function rejectRequest(id) {
  const { data } = await client.post(`/proxmox/approvals/${id}/reject`, {}, { headers: getRoleHeaders() });
  return data;
}

export default client;
