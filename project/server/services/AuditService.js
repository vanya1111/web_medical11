const { AuditLog } = require('../models');

const AuditAction = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  VIEW_RECORD: 'VIEW_RECORD',
  VIEW_RECORDS_LIST: 'VIEW_RECORDS_LIST',
  CREATE_RECORD: 'CREATE_RECORD',
  UPDATE_RECORD: 'UPDATE_RECORD',
  CHANGE_STATUS: 'CHANGE_STATUS',
  DELETE_RECORD: 'DELETE_RECORD',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
  INTEGRITY_VIOLATION: 'INTEGRITY_VIOLATION',
  ACCESS_DENIED: 'ACCESS_DENIED'
};

async function log({ action, success, details = '', targetEntity = '', user = null, req = null }) {
  try {
    await AuditLog.create({
      userId: user?.id || null,
      username: user?.username || 'anonymous',
      userRole: user?.role || 'none',
      action,
      targetEntity,
      details,
      success,
      ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
      timestamp: new Date()
    });
  } catch (err) {
    console.error('AuditService error:', err.message);
  }
}

module.exports = { log, AuditAction };
