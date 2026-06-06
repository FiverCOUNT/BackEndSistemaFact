const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuarioModel');
const {
  signAccessToken,
  generateRefreshToken,
} = require('../utils/tokens');

function buildAccessToken(user) {
  return signAccessToken({
    sub: user.id,
    email: user.email,
    companyId: user.companyId ? Number(user.companyId) : null,
  });
}

async function login({ email, contrasena }) {
  const user = await usuarioModel.findByEmail(email);
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

  const updated = await usuarioModel.findById(user.id);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    user: {
      ...usuarioModel.toPublicUser(updated),
      companyRuc: updated.company?.ruc ?? null,
      companyNombre: updated.company?.nombre ?? null,
      rol: updated.rol,
      almacenId: updated.almacenId ?? null,
      almacenNombre: updated.almacen?.nombre ?? null,
    },
  };
}

module.exports = {
  login,
  refresh,
};
