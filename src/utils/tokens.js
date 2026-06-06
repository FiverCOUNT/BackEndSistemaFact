const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');

function signAccessToken(payload) {
  return jwt.sign(payload, authConfig.jwtSecret, {
    expiresIn: authConfig.accessExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, authConfig.jwtSecret);
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function refreshExpiresAt() {
  return new Date(Date.now() + authConfig.refreshExpiresMs);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  refreshExpiresAt,
};
