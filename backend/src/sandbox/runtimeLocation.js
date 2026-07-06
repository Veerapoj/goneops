const PVE_HOST = process.env.PVE_SSH_HOST || '192.168.1.165';

function resolveRuntimeHost() {
  return PVE_HOST;
}

function buildPreviewUrl(port) {
  if (!port) return null;
  return `http://${PVE_HOST}:${port}`;
}

module.exports = { resolveRuntimeHost, buildPreviewUrl };
