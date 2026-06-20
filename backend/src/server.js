const http = require('http');
const app = require('./app');
const { createPool } = require('./lib/db');
const { createRedisClient } = require('./lib/redis');
const { createMQClient } = require('./lib/mq');
const { handleTerminal } = require('./routes/terminal');
const { reconcileOnStartup } = require('./operations/reconciler');

const PORT = process.env.PORT || 4000;

async function main() {
  try {
    await createPool();
    console.log('[goneops] PostgreSQL connected');
  } catch (err) {
    console.error('[goneops] PostgreSQL connection failed, retrying...', err.message);
  }
  try {
    await createRedisClient();
    console.log('[goneops] Redis connected');
  } catch (err) {
    console.error('[goneops] Redis connection failed, retrying...', err.message);
  }
  try {
    await createMQClient();
    console.log('[goneops] RabbitMQ connected');
  } catch (err) {
    console.error('[goneops] RabbitMQ connection failed, retrying...', err.message);
  }

  await reconcileOnStartup();

  const server = http.createServer(app);

  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith('/api/projects/') && url.pathname.endsWith('/terminal')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        handleTerminal(ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(PORT, () => {
    console.log(`[goneops] Backend API running on port ${PORT}`);
  });
}

main();
