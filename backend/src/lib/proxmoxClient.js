const axios = require('axios');
const https = require('https');

function createClient({ host, port, tokenUser, tokenId, tokenSecret, verifySsl }) {
  const baseURL = `https://${host}:${port || 8006}/api2/json`;
  const agent = new https.Agent({ rejectUnauthorized: verifySsl !== false });

  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      Authorization: `PVEAPIToken=${tokenUser}!${tokenId}=${tokenSecret}`,
      Accept: 'application/json',
    },
    httpsAgent: agent,
  });

  return instance;
}

async function testConnection(client) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.get('/version');
  return data;
}

async function getNodes(client) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.get('/nodes');
  return (data && data.data) || [];
}

async function getNodeVMs(client, node) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.get(`/nodes/${node}/qemu`);
  return (data && data.data) || [];
}

async function getNodeLXC(client, node) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.get(`/nodes/${node}/lxc`);
  return (data && data.data) || [];
}

async function getVM(client, node, vmid) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const [statusRes, configRes] = await Promise.all([
    instance.get(`/nodes/${node}/qemu/${vmid}/status/current`),
    instance.get(`/nodes/${node}/qemu/${vmid}/config`),
  ]);
  return {
    status: (statusRes.data && statusRes.data.data) || {},
    config: (configRes.data && configRes.data.data) || {},
  };
}

async function getLXC(client, node, vmid) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const [statusRes, configRes] = await Promise.all([
    instance.get(`/nodes/${node}/lxc/${vmid}/status/current`),
    instance.get(`/nodes/${node}/lxc/${vmid}/config`),
  ]);
  return {
    status: (statusRes.data && statusRes.data.data) || {},
    config: (configRes.data && configRes.data.data) || {},
  };
}

async function startVM(client, node, vmid, type) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const sub = type === 'lxc' ? 'lxc' : 'qemu';
  const { data } = await instance.post(`/nodes/${node}/${sub}/${vmid}/status/start`);
  return data;
}

async function stopVM(client, node, vmid, type) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const sub = type === 'lxc' ? 'lxc' : 'qemu';
  const { data } = await instance.post(`/nodes/${node}/${sub}/${vmid}/status/stop`);
  return data;
}

async function rebootVM(client, node, vmid, type) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const sub = type === 'lxc' ? 'lxc' : 'qemu';
  const { data } = await instance.post(`/nodes/${node}/${sub}/${vmid}/status/reboot`);
  return data;
}

async function getTaskStatus(client, node, upid) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.get(`/nodes/${node}/tasks/${encodeURIComponent(upid)}/status`);
  return (data && data.data) || {};
}

async function getNextId(client) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.get('/cluster/nextid');
  return (data && data.data) || null;
}

async function cloneVM(client, node, vmid, { newid, name, target }) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const body = { newid, name };
  if (target) body.target = target;
  const { data } = await instance.post(`/nodes/${node}/qemu/${vmid}/clone`, body);
  return data;
}

async function createSnapshot(client, node, vmid, type, snapname, description) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const sub = type === 'lxc' ? 'lxc' : 'qemu';
  const body = { snapname };
  if (description) body.description = description;
  const { data } = await instance.post(`/nodes/${node}/${sub}/${vmid}/snapshot`, body);
  return data;
}

async function listSnapshots(client, node, vmid, type) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const sub = type === 'lxc' ? 'lxc' : 'qemu';
  const { data } = await instance.get(`/nodes/${node}/${sub}/${vmid}/snapshot`);
  return (data && data.data) || [];
}

async function rollbackSnapshot(client, node, vmid, type, snapname) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const sub = type === 'lxc' ? 'lxc' : 'qemu';
  const { data } = await instance.post(`/nodes/${node}/${sub}/${vmid}/snapshot/${encodeURIComponent(snapname)}/rollback`);
  return data;
}

async function deleteVM(client, node, vmid) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.delete(`/nodes/${node}/qemu/${vmid}`, { params: { 'destroy-unreferenced-disks': 1, purge: 1 } });
  return data;
}

async function deleteLXC(client, node, vmid) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.delete(`/nodes/${node}/lxc/${vmid}`, { params: { 'destroy-unreferenced-disks': 1, purge: 1 } });
  return data;
}

async function createLXC(client, node, config) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.post(`/nodes/${node}/lxc`, config);
  return data;
}

async function createVM(client, node, config) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const { data } = await instance.post(`/nodes/${node}/qemu`, config);
  return data;
}

async function listStorageContent(client, node, storage, content) {
  let instance;
  if (typeof client.get === 'function') {
    instance = client;
  } else {
    instance = createClient(client);
  }
  const params = {};
  if (content) params.content = content;
  const { data } = await instance.get(`/nodes/${node}/storage/${storage}/content`, { params });
  return (data && data.data) || [];
}

module.exports = {
  createClient,
  testConnection,
  getNodes,
  getNodeVMs,
  getNodeLXC,
  getVM,
  getLXC,
  startVM,
  stopVM,
  rebootVM,
  deleteVM,
  deleteLXC,
  createLXC,
  createVM,
  listStorageContent,
  getTaskStatus,
  getNextId,
  cloneVM,
  createSnapshot,
  listSnapshots,
  rollbackSnapshot,
};
