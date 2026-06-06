const { verifyAccessToken } = require('../utils/tokens');
const usuarioModel = require('../models/usuarioModel');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido (Authorization: Bearer)',
      });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
      });
    }

    const user = await usuarioModel.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (user.estado !== 'ACTIVO') {
      return res.status(403).json({ success: false, message: 'Usuario inactivo' });
    }

    if (user.token !== token) {
      return res.status(401).json({
        success: false,
        message: 'Sesión cerrada o token revocado',
      });
    }

    req.user = usuarioModel.toPublicUser(user);
    req.userId = user.id;
    req.userRol = user.rol;
    req.userAlmacenId = user.almacenId || null;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
