/**
 * Saldo actual de inventario por almacén.
 *
 * Arquitectura:
 * - `inventario` → stock vivo (lecturas de catálogo, ventas, reportes).
 * - `movimientos` + `linea_catalogo_items` → solo historial/auditoría.
 *
 * Al confirmar una entrada/salida/traslado se actualiza esta tabla;
 * nunca se recalcula stock sumando movimientos.
 */
const prisma = require('../config/prisma');

function saldoKey(catalogItemId, almacenId) {
  return `${catalogItemId}:${almacenId}`;
}

function toNumber(value) {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function getCantidadEnAlmacen(catalogItemId, almacenId, { manejaSerie = false } = {}) {
  if (!almacenId) return 0;

  if (manejaSerie) {
    const agg = await prisma.inventario.aggregate({
      where: {
        catalogItemId,
        almacenId,
        productoSerieId: { not: null },
        productoSerie: { estado: 'DISPONIBLE' },
      },
      _sum: { cantidad: true },
    });
    return toNumber(agg._sum.cantidad);
  }

  const row = await prisma.inventario.findUnique({
    where: { saldoKey: saldoKey(catalogItemId, almacenId) },
    select: { cantidad: true },
  });
  return toNumber(row?.cantidad);
}

async function getCantidadTotal(catalogItemId, { manejaSerie = false } = {}) {
  if (manejaSerie) {
    const agg = await prisma.inventario.aggregate({
      where: {
        catalogItemId,
        productoSerieId: { not: null },
        productoSerie: { estado: 'DISPONIBLE' },
      },
      _sum: { cantidad: true },
    });
    return toNumber(agg._sum.cantidad);
  }

  const agg = await prisma.inventario.aggregate({
    where: {
      catalogItemId,
      saldoKey: { not: null },
    },
    _sum: { cantidad: true },
  });
  return toNumber(agg._sum.cantidad);
}

async function getCatalogItemIdsEnAlmacen(companyRuc, almacenId) {
  const rows = await prisma.inventario.findMany({
    where: {
      companyRuc,
      almacenId,
      OR: [
        { saldoKey: { not: null }, cantidad: { gt: 0 } },
        {
          productoSerieId: { not: null },
          productoSerie: { estado: 'DISPONIBLE' },
          cantidad: { gt: 0 },
        },
      ],
    },
    select: { catalogItemId: true },
    distinct: ['catalogItemId'],
  });

  return new Set(rows.map((r) => r.catalogItemId));
}

async function upsertSaldo({ companyRuc, catalogItemId, almacenId, cantidad }) {
  const key = saldoKey(catalogItemId, almacenId);
  const qty = toNumber(cantidad);

  if (qty <= 0) {
    await prisma.inventario.deleteMany({ where: { saldoKey: key } });
    return null;
  }

  return prisma.inventario.upsert({
    where: { saldoKey: key },
    create: {
      companyRuc,
      catalogItemId,
      almacenId,
      saldoKey: key,
      cantidad: qty,
    },
    update: { cantidad: qty },
  });
}

async function registrarUnidadSerie({
  companyRuc,
  catalogItemId,
  almacenId,
  productoSerieId,
  cantidad = 1,
}) {
  return prisma.inventario.upsert({
    where: { productoSerieId },
    create: {
      companyRuc,
      catalogItemId,
      almacenId,
      productoSerieId,
      cantidad: toNumber(cantidad) || 1,
    },
    update: {
      catalogItemId,
      almacenId,
      cantidad: toNumber(cantidad) || 1,
    },
  });
}

async function eliminarPorSerie(productoSerieId) {
  return prisma.inventario.deleteMany({ where: { productoSerieId } });
}

function toApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    company_ruc: row.companyRuc,
    catalog_item_id: row.catalogItemId,
    almacen_id: row.almacenId,
    producto_serie_id: row.productoSerieId,
    saldo_key: row.saldoKey,
    cantidad: toNumber(row.cantidad),
    tipo: row.productoSerieId ? 'SERIE' : 'SALDO',
    catalog_item_nombre: row.catalogItem?.nombre ?? null,
    almacen_nombre: row.almacen?.nombre ?? null,
    almacen_codigo: row.almacen?.codigo ?? null,
    numero_serie: row.productoSerie?.numeroSerie ?? null,
  };
}

const listInclude = {
  catalogItem: { select: { id: true, nombre: true, manejaSerie: true, manejaStock: true } },
  almacen: { select: { id: true, nombre: true, codigo: true } },
  productoSerie: { select: { id: true, numeroSerie: true, estado: true } },
};

function buildListWhere({ companyRuc, almacenId, catalogItemId, soloConStock = false }) {
  const where = { companyRuc };

  if (almacenId) where.almacenId = almacenId;
  if (catalogItemId) where.catalogItemId = catalogItemId;

  if (soloConStock) {
    where.cantidad = { gt: 0 };
  }

  return where;
}

async function findMany({ companyRuc, almacenId, catalogItemId, soloConStock = false }) {
  const rows = await prisma.inventario.findMany({
    where: buildListWhere({ companyRuc, almacenId, catalogItemId, soloConStock }),
    include: listInclude,
    orderBy: [{ almacenId: 'asc' }, { catalogItemId: 'asc' }],
  });

  return rows.map(toApi);
}

async function findById(id, companyRuc) {
  const row = await prisma.inventario.findFirst({
    where: { id, companyRuc },
    include: listInclude,
  });
  return row ? toApi(row) : null;
}

async function ajustarSaldo({ companyRuc, catalogItemId, almacenId, delta }) {
  const item = await prisma.catalogItem.findFirst({
    where: { id: catalogItemId, companyRuc },
  });
  if (!item) return { error: 'item_not_found' };
  if (item.manejaSerie) return { error: 'use_series' };

  const almacen = await prisma.almacen.findFirst({
    where: { id: almacenId, companyRuc },
  });
  if (!almacen) return { error: 'almacen_not_found' };

  const actual = await getCantidadEnAlmacen(catalogItemId, almacenId);
  const nueva = actual + toNumber(delta);
  if (nueva < 0) return { error: 'stock_insuficiente', cantidad_actual: actual };

  const row = await upsertSaldo({
    companyRuc,
    catalogItemId,
    almacenId,
    cantidad: nueva,
  });

  const full = row
    ? await prisma.inventario.findUnique({ where: { id: row.id }, include: listInclude })
    : null;

  return { row: full ? toApi(full) : null, cantidad_anterior: actual, cantidad_nueva: nueva };
}

async function establecerSaldo({ companyRuc, catalogItemId, almacenId, cantidad }) {
  const item = await prisma.catalogItem.findFirst({
    where: { id: catalogItemId, companyRuc },
  });
  if (!item) return { error: 'item_not_found' };
  if (item.manejaSerie) return { error: 'use_series' };

  const almacen = await prisma.almacen.findFirst({
    where: { id: almacenId, companyRuc },
  });
  if (!almacen) return { error: 'almacen_not_found' };

  const qty = toNumber(cantidad);
  if (qty < 0) return { error: 'cantidad_invalida' };

  const anterior = await getCantidadEnAlmacen(catalogItemId, almacenId);
  const row = await upsertSaldo({ companyRuc, catalogItemId, almacenId, cantidad: qty });

  const full = row
    ? await prisma.inventario.findUnique({ where: { id: row.id }, include: listInclude })
    : null;

  return {
    row: full ? toApi(full) : null,
    cantidad_anterior: anterior,
    cantidad_nueva: qty,
  };
}

module.exports = {
  saldoKey,
  toApi,
  getCantidadEnAlmacen,
  getCantidadTotal,
  getCatalogItemIdsEnAlmacen,
  findMany,
  findById,
  upsertSaldo,
  registrarUnidadSerie,
  eliminarPorSerie,
  ajustarSaldo,
  establecerSaldo,
};
