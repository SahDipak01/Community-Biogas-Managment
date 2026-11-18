const AuditLog = require('../models/AuditLog');

/**
 * Non-blocking audit trail logger for critical state-changing actions
 */
async function logAuditEvent(req, { action, entityType, entityId = '', summary, metadata = {} }) {
  try {
    const actor = req?.user || null;
    await AuditLog.create({
      actor: actor ? actor._id || actor.id : null,
      actorName: actor ? actor.name : 'Public / System',
      actorEmail: actor ? actor.email : '',
      actorRole: actor ? actor.role : 'public',
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      summary,
      metadata,
      ipAddress: req?.ip || req?.connection?.remoteAddress || ''
    });
  } catch (err) {
    // Never block primary user operation if audit logging encounters a transient issue
    console.warn('[AuditLog] Failed to persist audit event:', err.message);
  }
}

module.exports = { logAuditEvent };
