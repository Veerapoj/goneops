const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const projectRoutes = require('./routes/projects');
const inventoryRoutes = require('./routes/inventory');
const proxmoxRoutes = require('./routes/proxmox');

const app = express();

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.use('/api', projectRoutes);
app.use('/api', inventoryRoutes);
app.use('/api/proxmox', proxmoxRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || 'internal_error';
  const message = status === 500 ? 'Internal server error' : (err.message || 'Unexpected error');
  const details = {};

  if (status === 503 && code === 'docker_unavailable' && err.details?.docker_error) {
    details.docker_error = String(err.details.docker_error).slice(0, 512);
  }

  console.error(`[goneops] ${code} (${status}): ${err.message}`);
  if (process.env.NODE_ENV === 'development' && status === 500) {
    details.stack = err.stack;
  }

  res.status(status).json({ error: { code, message, details } });
});

module.exports = app;
