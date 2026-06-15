const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { hashPassword } = require('../services/CryptoService');
const { log, AuditAction } = require('../services/AuditService');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/users  (Admin only)
router.get('/', requireRole('Admin'), async (req, res) => {
  const users = await User.findAll({
    attributes: ['id','username','fullName','role','email','isActive','createdAt','lastLoginAt'],
    order: [['fullName','ASC']]
  });
  res.json(users);
});

// GET /api/users/patients  (Admin + Doctor)
router.get('/patients', requireRole('Admin','Doctor'), async (req, res) => {
  const patients = await User.findAll({
    where: { role: 'Patient', isActive: true },
    attributes: ['id','username','fullName','email','lastLoginAt'],
    order: [['fullName','ASC']]
  });
  res.json(patients);
});

// POST /api/users  (Admin only)
router.post('/', requireRole('Admin'), [
  body('username').trim().notEmpty().isLength({ min: 3 }),
  body('password').isLength({ min: 8 }).withMessage('Мінімум 8 символів'),
  body('fullName').trim().notEmpty(),
  body('role').isIn(['Admin','Doctor','Patient'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { username, password, fullName, email, role } = req.body;
    const exists = await User.findOne({ where: { username: username.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'Логін вже використовується' });

    const user = await User.create({
      username: username.toLowerCase(),
      passwordHash: await hashPassword(password),
      fullName, email, role
    });

    await log({ action: AuditAction.CREATE_USER, success: true,
      details: `Created user '${user.username}' role=${role}`,
      targetEntity: `User#${user.id}`, user: req.user, req });

    res.status(201).json({ id: user.id, message: 'Користувача створено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка створення користувача' });
  }
});

// PUT /api/users/:id  (Admin only)
router.put('/:id', requireRole('Admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });

    const { fullName, email } = req.body;
    await user.update({ fullName, email });

    await log({ action: AuditAction.UPDATE_USER, success: true,
      targetEntity: `User#${user.id}`, user: req.user, req });

    res.json({ message: 'Дані оновлено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка оновлення' });
  }
});

// PATCH /api/users/:id/status  (Admin only)
router.patch('/:id/status', requireRole('Admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });

    await user.update({ isActive: req.body.isActive });

    await log({ action: AuditAction.UPDATE_USER, success: true,
      details: `isActive set to ${req.body.isActive}`,
      targetEntity: `User#${user.id}`, user: req.user, req });

    res.json({ message: 'Статус оновлено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка' });
  }
});

// PATCH /api/users/:id/password
router.patch('/:id/password', [
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });

    // Only Admin or the user themselves
    if (req.user.role !== 'Admin' && req.user.id !== user.id) {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    await user.update({ passwordHash: await hashPassword(req.body.newPassword) });

    await log({ action: AuditAction.CHANGE_PASSWORD, success: true,
      targetEntity: `User#${user.id}`, user: req.user, req });

    res.json({ message: 'Пароль змінено' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка зміни пароля' });
  }
});

module.exports = router;
