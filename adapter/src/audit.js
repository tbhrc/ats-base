const { pool } = require('./db');

async function logAudit(actor, action, entityType, entityId, details) {
  await pool.execute(
    'INSERT INTO tb_adapter_audit_log (actor, action, entity_type, entity_id, details) VALUES (:actor, :action, :entityType, :entityId, :details)',
    { actor, action, entityType, entityId, details: JSON.stringify(details || {}) }
  );
}

module.exports = { logAudit };
