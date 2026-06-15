const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { MedicalRecord, User } = require('../models');
const { encryptRecordFields, decryptRecordFields } = require('../services/CryptoService');
const { log, AuditAction } = require('../services/AuditService');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Helper: build decrypted response
function buildRecord(r, patientName, doctorName) {
  const decrypted = decryptRecordFields(r);
  if (!decrypted.integrityValid) {
    // Log integrity violation (async, don't await)
    log({ action: AuditAction.INTEGRITY_VIOLATION, success: false,
      details: `HMAC mismatch on MedicalRecord#${r.id}`, targetEntity: `MedicalRecord#${r.id}` });
  }
  return {
    id: r.id,
    patientId: r.patientId,
    patientName,
    doctorId: r.doctorId,
    doctorName,
    recordType: r.recordType,
    status: r.status,
    recordDate: r.recordDate,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    integrityValid: decrypted.integrityValid,
    ...decrypted
  };
}

// GET /api/records?patientId=&status=&type=&from=&to=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { patientId, status, type, from, to, page = 1, limit = 20 } = req.query;
    const where = { isDeleted: false };

    // Patient can only see own records
    if (req.user.role === 'Patient') {
      where.patientId = req.user.id;
    } else if (patientId) {
      where.patientId = patientId;
    }

    if (status) where.status = status;
    if (type) where.recordType = type;
    if (from || to) {
      where.recordDate = {};
      if (from) where.recordDate[Op.gte] = new Date(from);
      if (to)   where.recordDate[Op.lte] = new Date(to);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await MedicalRecord.findAndCountAll({
      where,
      include: [
        { model: User, as: 'patient', attributes: ['id','fullName'] },
        { model: User, as: 'doctor',  attributes: ['id','fullName'] }
      ],
      order: [['recordDate','DESC']],
      limit: Number(limit),
      offset
    });

    const records = rows.map(r => buildRecord(r, r.patient?.fullName, r.doctor?.fullName));

    await log({ action: AuditAction.VIEW_RECORDS_LIST, success: true,
      details: `Viewed ${records.length} records`, user: req.user, req });

    res.json({ total: count, page: Number(page), limit: Number(limit), records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання записів' });
  }
});

// GET /api/records/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await MedicalRecord.findOne({
      where: { id: req.params.id, isDeleted: false },
      include: [
        { model: User, as: 'patient', attributes: ['id','fullName'] },
        { model: User, as: 'doctor',  attributes: ['id','fullName'] }
      ]
    });

    if (!r) return res.status(404).json({ error: 'Запис не знайдено' });

    // Patient can only access own records
    if (req.user.role === 'Patient' && r.patientId !== req.user.id) {
      await log({ action: AuditAction.ACCESS_DENIED, success: false,
        details: `Patient tried to access record of another patient`,
        targetEntity: `MedicalRecord#${r.id}`, user: req.user, req });
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    await log({ action: AuditAction.VIEW_RECORD, success: true,
      targetEntity: `MedicalRecord#${r.id}`, user: req.user, req });

    res.json(buildRecord(r, r.patient?.fullName, r.doctor?.fullName));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання запису' });
  }
});

// POST /api/records
router.post('/', requireRole('Admin','Doctor'), [
  body('patientId').isInt().withMessage('patientId обов\'язковий'),
  body('recordType').notEmpty(),
  body('recordDate').isISO8601(),
  body('diagnosis').notEmpty().withMessage('Діагноз обов\'язковий')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { patientId, recordType, recordDate, diagnosis, treatment, medications, notes } = req.body;

    const patient = await User.findOne({ where: { id: patientId, role: 'Patient' } });
    if (!patient) return res.status(404).json({ error: 'Пацієнта не знайдено' });

    const encrypted = encryptRecordFields({ diagnosis, treatment, medications, notes });

    const record = await MedicalRecord.create({
      patientId,
      doctorId: req.user.id,
      recordType,
      recordDate: new Date(recordDate),
      ...encrypted,
      status: 'Active'
    });

    await log({ action: AuditAction.CREATE_RECORD, success: true,
      details: `Created record type=${recordType} patientId=${patientId}`,
      targetEntity: `MedicalRecord#${record.id}`, user: req.user, req });

    res.status(201).json({ id: record.id, message: 'Запис створено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка створення запису' });
  }
});

// PUT /api/records/:id
router.put('/:id', requireRole('Admin','Doctor'), async (req, res) => {
  try {
    const r = await MedicalRecord.findOne({ where: { id: req.params.id, isDeleted: false } });
    if (!r) return res.status(404).json({ error: 'Запис не знайдено' });

    const { diagnosis, treatment, medications, notes } = req.body;
    const encrypted = encryptRecordFields({ diagnosis, treatment, medications, notes });

    await r.update(encrypted);

    await log({ action: AuditAction.UPDATE_RECORD, success: true,
      targetEntity: `MedicalRecord#${r.id}`, user: req.user, req });

    res.json({ message: 'Запис оновлено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка оновлення запису' });
  }
});

// PATCH /api/records/:id/status
router.patch('/:id/status', requireRole('Admin','Doctor'), [
  body('status').isIn(['Active','Completed','Archived'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const r = await MedicalRecord.findOne({ where: { id: req.params.id, isDeleted: false } });
    if (!r) return res.status(404).json({ error: 'Запис не знайдено' });

    await r.update({ status: req.body.status });

    await log({ action: AuditAction.CHANGE_STATUS, success: true,
      details: `Status changed to ${req.body.status}`,
      targetEntity: `MedicalRecord#${r.id}`, user: req.user, req });

    res.json({ message: 'Статус оновлено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка зміни статусу' });
  }
});

// DELETE /api/records/:id (soft-delete, Admin only)
router.delete('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const r = await MedicalRecord.findByPk(req.params.id);
    if (!r) return res.status(404).json({ error: 'Запис не знайдено' });

    await r.update({ isDeleted: true });

    await log({ action: AuditAction.DELETE_RECORD, success: true,
      targetEntity: `MedicalRecord#${r.id}`, user: req.user, req });

    res.json({ message: 'Запис видалено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка видалення запису' });
  }
});

module.exports = router;
