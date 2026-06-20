const emisorConfig = require('../config/emisor');

const ENDPOINTS = {
  '01': '/api/comprobantes/factura',
  '03': '/api/comprobantes/boleta',
  '07': '/api/comprobantes/nota',
  '08': '/api/comprobantes/nota',
  '09': '/api/comprobantes/guia-remision',
};

class EmisorClientError extends Error {
  constructor(message, { status = 502, cause, data } = {}) {
    super(message);
    this.name = 'EmisorClientError';
    this.status = status;
    this.cause = cause;
    this.data = data;
  }
}

async function request(path, payload) {
  const url = `${emisorConfig.baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), emisorConfig.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new EmisorClientError('El servicio EMISOR respondió con un formato inválido.', {
        status: 502,
        data: { raw: text.slice(0, 500) },
      });
    }

    if (!response.ok && data.success !== false) {
      throw new EmisorClientError(data.error || data.message || 'Error al comunicarse con EMISOR.', {
        status: response.status,
        data,
      });
    }

    return { status: response.status, data };
  } catch (err) {
    if (err instanceof EmisorClientError) throw err;

    if (err.name === 'AbortError') {
      throw new EmisorClientError('Tiempo de espera agotado al contactar el servicio EMISOR.', {
        status: 504,
        cause: err,
      });
    }

    throw new EmisorClientError(
      `No se pudo conectar con EMISOR en ${emisorConfig.baseUrl}. Verifica que el servidor PHP esté activo.`,
      { status: 502, cause: err },
    );
  } finally {
    clearTimeout(timer);
  }
}

async function health() {
  const url = `${emisorConfig.baseUrl}/health`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new EmisorClientError('EMISOR no está disponible.', { status: 502 });
  }
  return response.json();
}

async function emitirComprobante(tipoDoc, payload) {
  const path = ENDPOINTS[tipoDoc];
  if (!path) {
    throw new EmisorClientError(`Tipo de comprobante no soportado para emisión: ${tipoDoc}`, {
      status: 400,
    });
  }

  return request(path, payload);
}

async function emitirResumen(payload) {
  return request('/api/comprobantes/resumen', payload);
}

module.exports = {
  EmisorClientError,
  health,
  emitirComprobante,
  emitirResumen,
};
