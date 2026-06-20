const comprobanteModel = require('../models/comprobanteModel');
const comprobanteEmisionService = require('../services/comprobanteEmisionService');
const emisorClient = require('../services/emisorClient');

const TIPOS_EMITIBLES = comprobanteEmisionService.TIPOS_EMITIBLES;
const ESTADOS_REEMITIBLES = comprobanteEmisionService.ESTADOS_REEMITIBLES;

function apiBaseFromRequest(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function serializeOptions(req) {
  const almacenId =
    req.userAlmacenId
    || (req.body?.almacen_id || req.body?.almacenId || req.query?.almacen_id || '').trim()
    || null;

  return {
    apiBaseUrl: apiBaseFromRequest(req),
    companyRuc: req.companyRuc,
    almacenId,
  };
}

/**
 * Mobile: POST /comprobantes
 * 1. Crea el comprobante en Prisma
 * 2. Llama al backend PHP (EMISOR)
 * 3. Persiste la respuesta SUNAT en Invoice
 * 4. Devuelve el comprobante guardado
 */
async function crearYEmitir(req, res, next) {
  try {
    const result = await comprobanteEmisionService.crearYEmitirDesdeMobile(
      req.companyRuc,
      req.body,
      serializeOptions(req),
    );

    return res.status(result.status).json(result.body);
  } catch (err) {
    if (err.message && !err.name) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const rows = await comprobanteModel.findAllByCompany(req.companyRuc, {
      desde: req.query.desde,
      hasta: req.query.hasta,
      ...serializeOptions(req),
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const invoice = await comprobanteModel.findByIdForEmission(req.params.id, req.companyRuc);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Comprobante no encontrado' });
    }

    res.json(comprobanteModel.toApiInvoice(invoice, serializeOptions(req)));
  } catch (err) {
    next(err);
  }
}

async function descargarArchivo(req, res, next) {
  try {
    const invoice = await comprobanteModel.findByIdForEmission(req.params.id, req.companyRuc);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Comprobante no encontrado' });
    }

    const formato = String(req.query.formato || 'a4').trim().toLowerCase();
    const archivo = await comprobanteModel.getArchivoBuffer(invoice, req.params.tipo, {
      formato,
      apiBaseUrl: apiBaseFromRequest(req),
    });
    if (!archivo) {
      return res.status(404).json({ success: false, message: 'Archivo no disponible' });
    }

    const sufijo = req.params.tipo === 'pdf' && (formato === 'ticket' || formato === 'thermal') ? '-ticket' : '';
    const nombre = `${invoice.serie}-${invoice.correlativo}${sufijo}.${archivo.ext}`;
    res.setHeader('Content-Type', archivo.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    return res.send(archivo.buffer);
  } catch (err) {
    next(err);
  }
}

/** Re-emite un borrador existente por id (uso interno / admin). */
async function emitir(req, res, next) {
  try {
    const invoice = await comprobanteModel.findByIdForEmission(req.params.id, req.companyRuc);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Comprobante no encontrado' });
    }

    if (!TIPOS_EMITIBLES.has(invoice.tipoDoc)) {
      return res.status(400).json({
        success: false,
        message: `Emisión no soportada para tipo ${invoice.tipoDoc}.`,
      });
    }

    if (!ESTADOS_REEMITIBLES.has(invoice.estado)) {
      return res.status(409).json({
        success: false,
        message: `El comprobante ya fue procesado (estado: ${invoice.estado}).`,
      });
    }

    const emitOptions = comprobanteEmisionService.resolveInventarioEmitOptions(invoice, {
      ...serializeOptions(req),
      lineasBody: req.body?.lineas || req.body?.lineasBody || null,
      almacenId:
        serializeOptions(req).almacenId
        || req.body?.almacen_id
        || req.body?.almacenId
        || null,
    });

    const comprobante = await comprobanteEmisionService.emitirComprobanteExistente(
      invoice,
      emitOptions,
    );
    const sunatOk = comprobante.estado === 'ACEPTADO' || comprobante.estado === 'ENVIADO';

    return res.status(200).json({
      ...comprobante,
      success: sunatOk,
      sunat_ok: sunatOk,
    });
  } catch (err) {
    if (err.code === 'inventario') {
      return res.status(409).json({
        success: false,
        message: err.message,
        inventario: err.inventario || null,
      });
    }
    if (err.name === 'EmisorClientError') {
      return res.status(err.status || 502).json({
        success: false,
        message: err.message,
        emisor: err.data || null,
      });
    }
    if (err.message) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
}

async function enviarResumen(req, res, next) {
  try {
    const fecha = (req.body.fecha_resumen || req.body.fechaResumen || req.query.fecha || null);
    const result = await comprobanteEmisionService.enviarResumenDiario(req.companyRuc, {
      fecha,
      apiBaseUrl: apiBaseFromRequest(req),
    });

    if (!result.success) {
      return res.status(422).json({ success: false, message: result.message || result.error?.mensaje, resumen: result });
    }

    res.json({ success: true, resumen: result });
  } catch (err) {
    if (err.name === 'EmisorClientError') {
      return res.status(err.status || 502).json({
        success: false,
        message: err.message,
        emisor: err.data || null,
      });
    }
    if (err.message) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
}

async function healthEmisor(req, res, next) {
  try {
    const data = await emisorClient.health();
    res.json({ success: true, emisor: data });
  } catch (err) {
    if (err.name === 'EmisorClientError') {
      return res.status(err.status || 502).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
}

module.exports = {
  crearYEmitir,
  list,
  getById,
  descargarArchivo,
  emitir,
  enviarResumen,
  healthEmisor,
};
