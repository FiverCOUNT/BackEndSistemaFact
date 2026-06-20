require('dotenv').config();

const baseUrl = (process.env.EMISOR_API_URL || 'http://localhost:8080').replace(/\/$/, '');

module.exports = {
  baseUrl,
  timeoutMs: Number(process.env.EMISOR_API_TIMEOUT_MS) || 120000,
};
