const prisma = require('../config/prisma');
const movimientoModel = require('../models/movimientoModel');

const TIPOS_VENTA = new Set(['01', '03']);

function buildLineasInventario(invoice) {
  const out = [];

  for (const detail of invoice.details || []) {
    const item = detail.catalogItem;
    if (!item || item.kind === 'SERVICE') continue;
    if (!item.manejaStock && !item.manejaSerie) continue;

    const linea = {
      catalog_item_id: detail.catalogItemId,
      cantidad: Number(detail.cantidad),
    };
    if (detail.productoSerieId) {
      linea.producto_serie_id = detail.productoSerieId;
    }
    out.push(linea);
  }

  return out;
}

async function registrarSalidaPorComprobante(invoice, options = {}) {
  if (!invoice?.id || !TIPOS_VENTA.has(invoice.tipoDoc)) {
    return { aplicado: false, motivo: 'tipo_no_aplica' };
  }

  const existente = await prisma.movimiento.findFirst({
    where: {
      companyRuc: invoice.companyRuc,
      comprobanteId: invoice.id,
      tipo: 'SALIDA',
    },
    select: { id: true },
  });
  if (existente) {
    return { aplicado: false, motivo: 'ya_registrado', movimiento_id: existente.id };
  }

  const almacenId = options.almacenId || invoice.almacenId || null;
  if (!almacenId) {
    return { aplicado: false, motivo: 'sin_almacen', message: 'Asigna un almacén al usuario o envía almacen_id en la venta.' };
  }

  const lineas = buildLineasInventario(invoice);
  if (!lineas.length) {
    return { aplicado: false, motivo: 'sin_lineas_inventario' };
  }

  const result = await movimientoModel.registrarSalida({
    companyRuc: invoice.companyRuc,
    almacenId,
    lineas,
    comprobanteId: invoice.id,
    clienteId: invoice.clienteId || null,
    observaciones: `Venta ${invoice.serie}-${invoice.correlativo}`,
  });

  if (result.error) {
    return {
      aplicado: false,
      motivo: result.error,
      catalog_item_id: result.catalogItemId,
      cantidad_actual: result.cantidad_actual,
      numero_serie: result.numeroSerie,
      message: mapInventarioError(result),
    };
  }

  return {
    aplicado: true,
    movimiento_id: result.movimiento?.id,
    movimiento: result.movimiento,
  };
}

function mapInventarioError(result) {
  const map = {
    almacen_not_found: 'Almacén no encontrado.',
    lineas_vacias: 'No hay líneas de inventario.',
    item_not_found: 'Producto no encontrado.',
    stock_insuficiente: 'Stock insuficiente para completar la venta.',
    series_requeridas: 'El producto requiere número de serie.',
    cantidad_series: 'Cada línea con serie debe tener cantidad 1.',
    series_no_disponibles: 'Una o más series no están disponibles.',
    cliente_requerido: 'Cliente requerido para la salida.',
  };
  return map[result.error] || `Error de inventario: ${result.error}`;
}

module.exports = {
  buildLineasInventario,
  registrarSalidaPorComprobante,
};
