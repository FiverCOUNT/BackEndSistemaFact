const objectStorageService = require('./objectStorageService');

function allowIncompleteCredentials() {
  return String(process.env.EMISOR_SUNAT_ALLOW_INCOMPLETE || '').toLowerCase() === 'true';
}

/**
 * Arma el bloque credenciales_sunat que EMISOR espera en cada POST.
 * certificado_url: URL pública R2 o presigned URL si el bucket es privado.
 */
async function buildForCompany(company) {
  if (!company?.ruc) {
    throw new Error('No se encontró la empresa emisora.');
  }

  const missing = [];
  if (!company.solUser) missing.push('usuario SOL');
  if (!company.solPass) missing.push('clave SOL');
  if (!company.rutaFirma) missing.push('certificado (.pfx)');
  if (!company.certificatePassword) missing.push('contraseña del certificado');

  if (missing.length) {
    if (allowIncompleteCredentials()) {
      return null;
    }
    throw new Error(
      `Configura los datos SUNAT de la empresa en el panel web: falta ${missing.join(', ')}.`,
    );
  }

  const certificadoUrl = await objectStorageService.resolveCertificadoUrl(company.rutaFirma);
  const entorno = (company.entorno || 'beta').toLowerCase();
  const modo = entorno === 'prod' || entorno === 'production' ? 'prod' : 'beta';

  const credenciales = {
    modo,
    ruc: company.ruc,
    usuario_sol: company.solUser,
    clave_sol: company.solPass,
    certificado_url: certificadoUrl,
    certificado_password: company.certificatePassword,
  };

  if (company.clientId) credenciales.api_client_id = company.clientId;
  if (company.clientSecret) credenciales.api_client_secret = company.clientSecret;

  return credenciales;
}

async function attachToPayload(company, payload) {
  const credenciales_sunat = await buildForCompany(company);
  if (!credenciales_sunat) return payload;
  return { ...payload, credenciales_sunat };
}

module.exports = {
  buildForCompany,
  attachToPayload,
};
