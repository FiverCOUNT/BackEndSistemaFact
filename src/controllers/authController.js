const authService = require('../services/authService');

function readLoginCredentials(body) {
  const email = (body.email || body.correo || '').trim().toLowerCase();
  const contrasena =
    body.contrasena ?? body.password ?? body.pin ?? body.contraseña ?? '';
  return { email, contrasena: String(contrasena) };
}

function readRefreshToken(req) {
  return (
    req.body.refreshToken ||
    req.body.refresh_token ||
    req.headers['x-refresh-token'] ||
    ''
  ).trim();
}

async function login(req, res, next) {
  try {
    const { email, contrasena } = readLoginCredentials(req.body || {});

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
    const refreshToken = readRefreshToken(req);

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'refreshToken es obligatorio',
      });
    }

    const data = await authService.refresh(refreshToken);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** Perfil de sesión actual (tokens + configuración de empresa y almacenes). */
async function me(req, res, next) {
  try {
    const data = await authService.sessionFromUserId(req.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refresh,
  me,
};
