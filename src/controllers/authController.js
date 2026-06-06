const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'email y contrasena son obligatorios',
      });
    }

    const data = await authService.login({ email, contrasena });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken =
      req.body.refreshToken ||
      req.body.refresh_token ||
      req.headers['x-refresh-token'];

    const data = await authService.refresh(refreshToken);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refresh,
};
