const path = require('path');
const objectStorageService = require('./objectStorageService');

const ALLOWED_EXT = new Set(['.pfx', '.p12', '.pem']);

function resolveCertFilename(companyRuc, originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const safeExt = ALLOWED_EXT.has(ext) ? ext : '.pfx';
  return `${companyRuc}${safeExt}`;
}

async function uploadCertificado(companyRuc, file) {
  if (!file?.buffer?.length) return null;

  if (!objectStorageService.isEnabled()) {
    throw new Error('R2/S3 no está configurado. Revisa S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY en .env');
  }

  const filename = resolveCertFilename(companyRuc, file.originalname);
  const result = await objectStorageService.uploadCertificado(companyRuc, file.buffer, filename);

  return {
    key: result.key,
    url: result.url,
    filename,
  };
}

module.exports = {
  uploadCertificado,
};
