const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MedicalRecord = sequelize.define('MedicalRecord', {
  id:                   { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  patientId:            { type: DataTypes.INTEGER, allowNull: false },
  doctorId:             { type: DataTypes.INTEGER, allowNull: false },
  encryptedDiagnosis:   { type: DataTypes.TEXT, allowNull: false },
  encryptedTreatment:   { type: DataTypes.TEXT, allowNull: false },
  encryptedMedications: { type: DataTypes.TEXT, allowNull: false },
  encryptedNotes:       { type: DataTypes.TEXT, allowNull: false },
  hmacSignature:        { type: DataTypes.TEXT, allowNull: false },
  recordType:           { type: DataTypes.STRING, allowNull: false, defaultValue: 'Consultation' },
  status:               { type: DataTypes.ENUM('Active','Completed','Archived'), defaultValue: 'Active' },
  recordDate:           { type: DataTypes.DATE, allowNull: false },
  isDeleted:            { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'MedicalRecords', timestamps: true });

module.exports = MedicalRecord;
