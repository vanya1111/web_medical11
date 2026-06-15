const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:       { type: DataTypes.INTEGER, allowNull: true },
  username:     { type: DataTypes.STRING, allowNull: false },
  userRole:     { type: DataTypes.STRING, allowNull: false },
  action:       { type: DataTypes.STRING, allowNull: false },
  targetEntity: { type: DataTypes.STRING, allowNull: true },
  details:      { type: DataTypes.TEXT, allowNull: true },
  success:      { type: DataTypes.BOOLEAN, allowNull: false },
  ipAddress:    { type: DataTypes.STRING, allowNull: true },
  timestamp:    { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'AuditLogs', timestamps: false });

module.exports = AuditLog;
