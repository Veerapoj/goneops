const { query } = require('./db');

async function writeAuditLog({ actor, action, resource_type, resource_id, provider_id, result, message, metadata }) {
  const res = await query(
    `INSERT INTO audit_logs (actor, action, resource_type, resource_id, provider_id, result, message, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [actor || 'system', action, resource_type || null, resource_id || null, provider_id || null, result, message || null, metadata ? JSON.stringify(metadata) : '{}']
  );
  return res.rows[0];
}

module.exports = { writeAuditLog };
