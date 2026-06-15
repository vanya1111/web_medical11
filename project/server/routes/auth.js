const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { verifyPassword, hashPassword } = require('../services/CryptoService');
const { log, AuditAction } = require('../services/AuditService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
}

// POST /api/auth/login
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Логін обов\'язковий'),
  body('password').notEmpty().withMessage('Пароль обов\'язковий')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, password } = req.body;
  const uname = username.trim().toLowerCase();

  try {
    const user = await User.findOne({ where: { username: uname } });

    // Check lockout
    if (user?.lockedUntil && new Date() < user.lockedUntil) {
      const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      await log({ action: AuditAction.LOGIN_FAILED, success: false,
        details: `Account locked for ${minutes} more min`, targetEntity: uname, req });
      return res.status(423).json({ error: `Акаунт заблоковано. Спробуйте через ${minutes} хв.` });
    }

    // Verify credentials
    const valid = user && user.isActive && await verifyPassword(password, user.passwordHash);

    if (!valid) {
      if (user) {
        const attempts = (user.loginAttempts || 0) + 1;
        const lockedUntil = attempts >= 5
          ? new Date(Date.now() + 15 * 60 * 1000)
          : null;
        await user.update({ loginAttempts: attempts, lockedUntil });
      }
      await log({ action: AuditAction.LOGIN_FAILED, success: false,
        details: 'Invalid credentials', targetEntity: uname, req });
      return res.status(401).json({ error: 'Невірний логін або пароль' });
    }

    // Success
    const { accessToken, refreshToken } = generateTokens(user.id);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await user.update({
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      refreshToken,
      refreshTokenExpiry: refreshExpiry
    });

    // HttpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await log({ action: AuditAction.LOGIN, success: true,
      details: `Login from ${req.ip}`, user, req });

    res.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'Refresh токен відсутній' });

  try {
    const payload = jwt.verify(token, process.env.REFRESH_SECRET);
    const user = await User.findByPk(payload.userId);

    if (!user || !user.isActive || user.refreshToken !== token ||
        new Date() > user.refreshTokenExpiry) {
      return res.status(401).json({ error: 'Невалідний refresh токен' });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(user.id);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await user.update({ refreshToken: newRefresh, refreshTokenExpiry: refreshExpiry });

    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await log({ action: AuditAction.TOKEN_REFRESH, success: true, user, req });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Невалідний або прострочений refresh токен' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await req.user.update({ refreshToken: null, refreshTokenExpiry: null });
  res.clearCookie('refreshToken');
  await log({ action: AuditAction.LOGOUT, success: true, user: req.user, req });
  res.json({ message: 'Вихід виконано' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const u = req.user;
  res.json({ id: u.id, username: u.username, fullName: u.fullName, role: u.role, email: u.email });
});

module.exports = router;
