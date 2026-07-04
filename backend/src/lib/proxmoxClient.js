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

module.exports = {
  createClient,
  testConnection,
  getNodes,
  getNodeVMs,
  getNodeLXC,
  getVM,
  getLXC,
};
