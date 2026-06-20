const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuarioModel');
const {
  signAccessToken,
  generateRefreshToken,
} = require('../utils/tokens');
const {
  loadCompanyForSession,
  buildConfiguracion,
} = require('./sessionConfigService');

function buildAccessToken(user) {
  return signAccessToken({
    sub: user.id,
    email: user.email,
    companyId: user.companyId ? Number(user.companyId) : null,
    companyRuc: user.company?.ruc ?? null,
    rol: user.rol || 'USUARIO',
    almacenId: user.almacenId != null ? String(user.almacenId) : null,
  });
}

async function login({ email, contrasena }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await usuarioModel.findByEmail(normalizedEmail);
  if (!user) {
    const err = new Error('Credenciales inválidas');
    err.status = 401;
    throw err;
  }

  if (user.estado !== 'ACTIVO') {
    const err = new Error('Usuario inactivo o no autorizado');
    err.status = 403;
    throw err;
  }

  const valid = await bcrypt.compare(contrasena, user.contrasena);
  if (!valid) {
    const err = new Error('Credenciales inválidas');
    err.status = 401;
    throw err;
  }

  return issueTokens(user);
}

async function refresh(refreshToken) {
  if (!refreshToken) {
    const err = new Error('refresh_token es obligatorio');
    err.status = 400;
    throw err;
  }

  const user = await usuarioModel.findByRefreshToken(refreshToken);
  if (!user || user.refreshToken !== refreshToken) {
    const err = new Error('Refresh token inválido');
    err.status = 401;
    throw err;
  }

  if (user.estado !== 'ACTIVO') {
    const err = new Error('Usuario inactivo o no autorizado');
    err.status = 403;
    throw err;
  }

  return issueTokens(user);
}

async function issueTokens(user) {
  const accessToken = buildAccessToken(user);
  const refreshToken = generateRefreshToken();

  await usuarioModel.saveTokens(user.id, {
    token: accessToken,
    refreshToken,
  });

  return sessionPayload(await usuarioModel.findById(user.id));
}

async function sessionPayload(updated) {
  if (!updated) {
    const err = new Error('Usuario no encontrado');
    err.status = 404;
    throw err;
  }

  const companyFull = await loadCompanyForSession(updated.companyId);
  const configuracion = await buildConfiguracion(companyFull);

  const almacenId =
    updated.almacenId != null ? String(updated.almacenId) : null;
  const almacenNombre = updated.almacen?.nombre ?? null;
  const almacenCodigo = updated.almacen?.codigo ?? null;

  const empresaPublica = configuracion?.empresa
    ?? (updated.company
      ? {
          ruc: updated.company.ruc,
          nombre: updated.company.nombre || 'Empresa',
        }
      : null);

  return {
    accessToken: updated.token,
    refreshToken: updated.refreshToken,
    tokenType: 'Bearer',
    almacenId,
    almacenNombre,
    almacenCodigo,
    configuracion,
    user: {
      ...usuarioModel.toPublicUser(updated),
      company: empresaPublica,
      companyRuc: empresaPublica?.ruc ?? updated.company?.ruc ?? null,
      companyNombre: empresaPublica?.nombre ?? updated.company?.nombre ?? null,
      rol: updated.rol,
      almacenId,
      almacenNombre,
      almacenCodigo,
    },
  };
}

async function sessionFromUserId(userId) {
  const user = await usuarioModel.findById(userId);
  return sessionPayload(user);
}

module.exports = {
  login,
  refresh,
  sessionFromUserId,
};
