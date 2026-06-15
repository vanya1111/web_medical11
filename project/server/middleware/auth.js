const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { log, AuditAction } = require('../services/AuditService');

// Verify JWT and attach user to req
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен відсутній' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Користувача не знайдено або деактивовано' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалідний або прострочений токен' });
  }
}

// Role-based access control
function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Не авторизовано' });

    if (!roles.includes(req.user.role)) {
      await log({
        action: AuditAction.ACCESS_DENIED,
        success: false,
        details: `Role '${req.user.role}' tried to access route requiring ${roles.join('/')}`,
        targetEntity: req.originalUrl,
        user: req.user,
        req
      });
      return res.status(403).json({ error: 'Недостатньо прав доступу' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
