const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const inventarioModel = require('./inventarioModel');
const productoSerieModel = require('./productoSerieModel');

function toNumber(value) {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return [];
}

function isoFecha() {
  return new Date().toISOString().slice(0, 19);
}

function toApiLinea(linea) {
  const numeros =
    normalizeStringArray(linea.numerosSerieApi) ||
    normalizeStringArray(linea.numerosSerie) ||
    (linea.productoSerie ? [linea.productoSerie.numeroSerie] : []);

  const ids =
    normalizeStringArray(linea.serieIds) ||
    (linea.productoSerieId ? [linea.productoSerieId] : []);

  return {
    linea_id: linea.lineaId,
    id: linea.externalId,
    catalog_item_id: linea.catalogItemId,
    nombre: linea.nombre,
    codigo: linea.codigo,
    descripcion: linea.descripcion,
    unidad: linea.unidad,
    precio_unitario: linea.precioUnitario != null ? toNumber(linea.precioUnitario) : null,
    afectacion_igv: linea.afectacionIgv,
    kind: linea.kind,
    maneja_stock: linea.manejaStock,
    maneja_serie: linea.manejaSerie,
    cantidad: toNumber(linea.cantidad),
    almacen_id: linea.almacenId,
    producto_serie_id: linea.productoSerieId,
    producto_serie: linea.productoSerie ? productoSerieModel.toApi(linea.productoSerie) : null,
    series: numeros,
    numeros_serie: numeros,
    serie_ids: ids,
  };
}

function toApiMovimiento(row) {
  if (!row) return null;
  return {
    id: row.id,
    company_ruc: row.companyRuc,
    almacen_id: row.almacenId,
    tipo: row.tipo,
    fecha: row.fecha,
    observaciones: row.observaciones,
    referencia_tipo: row.referenciaTipo,
    referencia_id: row.referenciaId,
    numero: row.numero,
    almacen_destino_id: row.almacenDestinoId,
    estado: row.estado,
    comprobante_id: row.comprobanteId,
    guia_remision_id: row.guiaRemisionId,
    fecha_despacho: row.fechaDespacho,
    lineas: (row.lineas || []).map(toApiLinea),
  };
}

const movimientoInclude = {
  lineas: {
    include: { productoSerie: true },
    orderBy: { lineaId: 'asc' },
  },
};

function parseLineaRequest(raw) {
  return {
    catalogItemId: (raw.catalog_item_id || raw.catalogItemId || '').trim(),
    cantidad: toNumber(raw.cantidad),
    numerosSerie: normalizeStringArray(raw.series || raw.numeros_serie || raw.numerosSerie),
    serieIds: normalizeStringArray(raw.serie_ids || raw.serieIds),
  };
}

function snapshotLineaFromItem(item, { almacenId, cantidad, productoSerieId, numerosSerie, serieIds }) {
  return {
    catalogItemId: item.id,
    nombre: item.nombre,
    codigo: item.codigo,
    descripcion: item.descripcion,
    unidad: item.unidad,
    precioUnitario: item.precioUnitario,
    afectacionIgv: item.afectacionIgv,
    kind: item.kind,
    manejaStock: item.manejaStock,
    manejaSerie: item.manejaSerie,
    cantidad,
    almacenId,
    productoSerieId: productoSerieId || null,
    numerosSerieApi: numerosSerie.length ? numerosSerie : null,
    numerosSerie: numerosSerie.length ? numerosSerie : null,
    serieIds: serieIds.length ? serieIds : null,
  };
}

async function nextNumeroEntrada(companyRuc, tx) {
  const client = tx || prisma;
  const count = await client.movimiento.count({
    where: { companyRuc, tipo: 'ENTRADA' },
  });
  return `MOV-${String(count + 1).padStart(4, '0')}`;
}

async function findMany({ companyRuc, tipo = null, almacenId = null }) {
  const where = { companyRuc };
  if (tipo) where.tipo = tipo;
  if (almacenId) where.almacenId = almacenId;

  const rows = await prisma.movimiento.findMany({
    where,
    include: movimientoInclude,
    orderBy: { fecha: 'desc' },
  });

  return rows.map(toApiMovimiento);
}

async function registrarEntrada({ companyRuc, almacenId, lineas, observaciones = null }) {
  const almacen = await prisma.almacen.findFirst({
    where: { id: almacenId, companyRuc },
  });
  if (!almacen) return { error: 'almacen_not_found' };

  const parsedLineas = (lineas || []).map(parseLineaRequest).filter((l) => l.catalogItemId);
  if (parsedLineas.length === 0) {
    return { error: 'lineas_vacias' };
  }

  const itemIds = [...new Set(parsedLineas.map((l) => l.catalogItemId))];
  const items = await prisma.catalogItem.findMany({
    where: { companyRuc, id: { in: itemIds } },
  });
  const itemsById = new Map(items.map((i) => [i.id, i]));

  for (const linea of parsedLineas) {
    const item = itemsById.get(linea.catalogItemId);
    if (!item) return { error: 'item_not_found', catalogItemId: linea.catalogItemId };
    if (item.activo === false) {
      return { error: 'item_inactivo', catalogItemId: linea.catalogItemId };
    }

    if (item.manejaSerie || linea.numerosSerie.length > 0) {
      const numeros = linea.numerosSerie;
      if (numeros.length === 0) {
        return { error: 'series_requeridas', catalogItemId: linea.catalogItemId };
      }
      if (linea.cantidad <= 0) linea.cantidad = numeros.length;
      if (linea.cantidad !== numeros.length) {
        return { error: 'cantidad_series', catalogItemId: linea.catalogItemId };
      }
      const dup = new Set();
      for (const num of numeros) {
        const key = num.toUpperCase();
        if (dup.has(key)) {
          return { error: 'serie_duplicada_linea', numeroSerie: num };
        }
        dup.add(key);
      }
    } else if (linea.cantidad <= 0) {
      return { error: 'cantidad_invalida', catalogItemId: linea.catalogItemId };
    }
  }

  const movimientoId = randomUUID();
  const fecha = isoFecha();
  const lineasCreate = [];

  try {
    await prisma.$transaction(async (tx) => {
      const numero = await nextNumeroEntrada(companyRuc, tx);

      for (const linea of parsedLineas) {
        const item = itemsById.get(linea.catalogItemId);
        const ingresaSeries = item.manejaSerie || linea.numerosSerie.length > 0;
        const afectaSaldo = item.kind === 'PRODUCT' && item.manejaStock && !ingresaSeries;

        if (ingresaSeries) {
          const numeros = linea.numerosSerie;
          const serieIdsCreados = [];

          for (const numeroSerie of numeros) {
            const existente = await tx.productoSerie.findFirst({
              where: { companyRuc, numeroSerie },
            });
            if (existente) {
              const err = new Error(`La serie ${numeroSerie} ya está registrada`);
              err.code = 'serie_existente';
              err.numeroSerie = numeroSerie;
              throw err;
            }

            const serieId = randomUUID();
            await tx.productoSerie.create({
              data: {
                id: serieId,
                companyRuc,
                catalogItemId: item.id,
                numeroSerie,
                almacenId,
                estado: 'DISPONIBLE',
              },
            });

            if (item.kind === 'PRODUCT') {
              await tx.inventario.create({
                data: {
                  companyRuc,
                  catalogItemId: item.id,
                  almacenId,
                  productoSerieId: serieId,
                  cantidad: 1,
                },
              });
            }

            serieIdsCreados.push(serieId);
          }

          if (item.manejaSerie !== true) {
            await tx.catalogItem.update({
              where: { id: item.id },
              data: { manejaSerie: true, manejaStock: true },
            });
          }

          lineasCreate.push(
            snapshotLineaFromItem(
              { ...item, manejaSerie: true, manejaStock: true },
              {
                almacenId,
                cantidad: numeros.length,
                productoSerieId: serieIdsCreados.length === 1 ? serieIdsCreados[0] : null,
                numerosSerie: numeros,
                serieIds: serieIdsCreados,
              },
            ),
          );
        } else if (afectaSaldo) {
          const key = inventarioModel.saldoKey(item.id, almacenId);
          const actualRow = await tx.inventario.findUnique({
            where: { saldoKey: key },
            select: { cantidad: true },
          });
          const actual = toNumber(actualRow?.cantidad);
          const nueva = actual + linea.cantidad;

          await tx.inventario.upsert({
            where: { saldoKey: key },
            create: {
              companyRuc,
              catalogItemId: item.id,
              almacenId,
              saldoKey: key,
              cantidad: nueva,
            },
            update: { cantidad: nueva },
          });

          lineasCreate.push(
            snapshotLineaFromItem(item, {
              almacenId,
              cantidad: linea.cantidad,
              numerosSerie: [],
              serieIds: [],
            }),
          );
        } else {
          lineasCreate.push(
            snapshotLineaFromItem(item, {
              almacenId,
              cantidad: linea.cantidad,
              numerosSerie: [],
              serieIds: [],
            }),
          );
        }
      }

      await tx.movimiento.create({
        data: {
          id: movimientoId,
          companyRuc,
          almacenId,
          tipo: 'ENTRADA',
          fecha,
          observaciones: observaciones?.trim() || null,
          referenciaTipo: 'INGRESO_MANUAL',
          numero,
          estado: 'DESPACHADA',
          lineas: {
            create: lineasCreate,
          },
        },
      });
    });
  } catch (err) {
    if (err.code === 'serie_existente') {
      return { error: 'serie_existente', numeroSerie: err.numeroSerie };
    }
    if (err.code === 'P2002') {
      return { error: 'serie_existente' };
    }
    console.error('[registrarEntrada]', err);
    throw err;
  }

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    include: movimientoInclude,
  });

  return { movimiento: toApiMovimiento(movimiento) };
}

module.exports = {
  toApiMovimiento,
  toApiLinea,
  findMany,
  registrarEntrada,
};
