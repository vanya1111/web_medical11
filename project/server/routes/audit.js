const express = require('express');
const { Op } = require('sequelize');
const { AuditLog, User } = require('../models');
const { log, AuditAction } = require('../services/AuditService');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('Admin'));

// GET /api/audit?username=&action=&from=&to=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { username, action, from, to, success, page = 1, limit = 50 } = req.query;
    const where = {};

    if (username) where.username = { [Op.like]: `%${username}%` };
    if (action)   where.action = action;
    if (success !== undefined) where.success = success === 'true';
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp[Op.gte] = new Date(from);
      if (to)   where.timestamp[Op.lte] = new Date(to);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: Number(limit),
      offset
    });

    await log({ action: AuditAction.VIEW_AUDIT_LOG, success: true,
      details: `Viewed audit log page ${page}`, user: req.user, req });

    res.json({ total: count, page: Number(page), limit: Number(limit), logs: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання логів' });
  }
});

// GET /api/audit/stats
router.get('/stats', async (req, res) => {
  try {
    const total = await AuditLog.count();
    const failed = await AuditLog.count({ where: { success: false } });
    const today = await AuditLog.count({
      where: { timestamp: { [Op.gte]: new Date(new Date().setHours(0,0,0,0)) } }
    });
    res.json({ total, failed, today, successRate: total ? Math.round((total-failed)/total*100) : 100 });
  } catch (err) {
    res.status(500).json({ error: 'Помилка статистики' });
  }
});

module.exports = router;
