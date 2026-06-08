require('./env');

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'cambiar-refresh-en-produccion';

if (process.env.NODE_ENV === 'production' && JWT_SECRET.includes('cambiar')) {
  throw new Error('Define JWT_SECRET y JWT_REFRESH_SECRET en producción');
}

module.exports = {
  jwtSecret: JWT_SECRET,
  jwtRefreshSecret: JWT_REFRESH_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '8h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  refreshExpiresMs: 7 * 24 * 60 * 60 * 1000,
};
