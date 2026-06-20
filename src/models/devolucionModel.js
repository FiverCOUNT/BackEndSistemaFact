const prisma = require('../config/prisma');
const productoSerieModel = require('./productoSerieModel');

function toNumber(value) {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function findPendientesPorCliente(companyRuc, clienteId) {
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, companyRuc, activo: true },
  });
  if (!cliente) return { error: 'cliente_not_found' };

  const entregas = await prisma.movimiento.findMany({
    where: { companyRuc, tipo: 'SALIDA', clienteId },
    select: { id: true },
  });
  const entregaIds = entregas.map((e) => e.id);
  if (entregaIds.length === 0) {
    return { items: [] };
  }

  const byItem = new Map();

  const series = await prisma.productoSerie.findMany({
    where: {
      companyRuc,
      estado: 'ENTREGADO',
      entregaId: { in: entregaIds },
    },
    include: {
      catalogItem: {
        select: {
          id: true,
          companyRuc: true,
          kind: true,
          codigo: true,
          nombre: true,
          descripcion: true,
          unidad: true,
          precioUnitario: true,
          afectacionIgv: true,
          activo: true,
          manejaStock: true,
          manejaSerie: true,
        },
      },
    },
    orderBy: [{ catalogItemId: 'asc' }, { numeroSerie: 'asc' }],
  });

  for (const serie of series) {
    const item = serie.catalogItem;
    if (!item) continue;

    if (!byItem.has(item.id)) {
      byItem.set(item.id, {
        catalog_item_id: item.id,
        company_ruc: item.companyRuc,
        kind: item.kind,
        codigo: item.codigo,
        nombre: item.nombre,
        descripcion: item.descripcion,
        unidad: item.unidad,
        precio_unitario: toNumber(item.precioUnitario),
        afectacion_igv: item.afectacionIgv,
        activo: item.activo,
        maneja_stock: item.manejaStock,
        maneja_serie: true,
        cantidad_pendiente: 0,
        series: [],
      });
    }

    const row = byItem.get(item.id);
    row.cantidad_pendiente += 1;
    row.series.push(productoSerieModel.toApi(serie));
  }

  const salidaLineas = await prisma.lineaCatalogoItem.findMany({
    where: {
      movimientoId: { in: entregaIds },
      productoSerieId: null,
      catalogItem: { manejaSerie: false, manejaStock: true },
    },
    include: {
      catalogItem: {
        select: {
          id: true,
          companyRuc: true,
          kind: true,
          codigo: true,
          nombre: true,
          descripcion: true,
          unidad: true,
          precioUnitario: true,
          afectacionIgv: true,
          activo: true,
          manejaStock: true,
          manejaSerie: true,
        },
      },
    },
  });

  const devoluciones = await prisma.movimiento.findMany({
    where: {
      companyRuc,
      tipo: 'ENTRADA',
      referenciaTipo: 'DEVOLUCION_CLIENTE',
      clienteId,
    },
    select: { id: true },
  });
  const devolucionIds = devoluciones.map((d) => d.id);

  const devolucionLineas =
    devolucionIds.length > 0
      ? await prisma.lineaCatalogoItem.findMany({
          where: {
            movimientoId: { in: devolucionIds },
            productoSerieId: null,
          },
          select: { catalogItemId: true, cantidad: true },
        })
      : [];

  const salidaQty = new Map();
  const itemMeta = new Map();
  for (const linea of salidaLineas) {
    const key = linea.catalogItemId;
    salidaQty.set(key, (salidaQty.get(key) ?? 0) + toNumber(linea.cantidad));
    if (!itemMeta.has(key) && linea.catalogItem) {
      itemMeta.set(key, linea.catalogItem);
    }
  }

  const devQty = new Map();
  for (const linea of devolucionLineas) {
    const key = linea.catalogItemId;
    devQty.set(key, (devQty.get(key) ?? 0) + toNumber(linea.cantidad));
  }

  for (const [catalogItemId, entregado] of salidaQty) {
    if (byItem.has(catalogItemId)) continue;
    const devuelto = devQty.get(catalogItemId) ?? 0;
    const pendiente = entregado - devuelto;
    if (pendiente <= 0) continue;

    const item = itemMeta.get(catalogItemId);
    if (!item) continue;

    byItem.set(catalogItemId, {
      catalog_item_id: item.id,
      company_ruc: item.companyRuc,
      kind: item.kind,
      codigo: item.codigo,
      nombre: item.nombre,
      descripcion: item.descripcion,
      unidad: item.unidad,
      precio_unitario: toNumber(item.precioUnitario),
      afectacion_igv: item.afectacionIgv,
      activo: item.activo,
      maneja_stock: item.manejaStock,
      maneja_serie: false,
      cantidad_pendiente: pendiente,
      series: [],
    });
  }

  const items = [...byItem.values()].sort((a, b) =>
    String(a.nombre).localeCompare(String(b.nombre)),
  );

  return { items };
}

module.exports = { findPendientesPorCliente };
