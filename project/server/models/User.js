const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id:               { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username:         { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash:     { type: DataTypes.STRING, allowNull: false },
  role:             { type: DataTypes.ENUM('Admin','Doctor','Patient'), allowNull: false },
  fullName:         { type: DataTypes.STRING, allowNull: false },
  email:            { type: DataTypes.STRING, allowNull: true },
  isActive:         { type: DataTypes.BOOLEAN, defaultValue: true },
  refreshToken:     { type: DataTypes.STRING, allowNull: true },
  refreshTokenExpiry: { type: DataTypes.DATE, allowNull: true },
  loginAttempts:    { type: DataTypes.INTEGER, defaultValue: 0 },
  lockedUntil:      { type: DataTypes.DATE, allowNull: true },
  lastLoginAt:      { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'Users', timestamps: true });

module.exports = User;
