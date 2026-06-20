const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const inventarioModel = require('./inventarioModel');
const productoSerieModel = require('./productoSerieModel');
const clienteModel = require('./clienteModel');
const { nowTimestampMs, toStoredTimestamp, toApiTimestamp, compareStoredTimestamps } = require('../utils/fechas');
function toNumber(value) {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function unidadPermiteSerie(unidad) {
  return String(unidad || 'NIU').toUpperCase() === 'NIU';
}

function usaSeriesInventario(item) {
  return Boolean(item?.manejaSerie && unidadPermiteSerie(item.unidad));
}

function lineaUsaSeries(item, linea) {
  return (
    usaSeriesInventario(item) ||
    linea.numerosSerie.length > 0 ||
    linea.serieIds.length > 0
  );
}

/** Producto por cantidad (LTR, KGM, NIU sin series): debe mover tabla inventario. */
function usaInventarioCantidad(item, linea) {
  return item.kind === 'PRODUCT' && !lineaUsaSeries(item, linea);
}

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  return [];
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

function toApiCliente(cliente) {
  if (!cliente) return undefined;
  return {
    tipo_doc: cliente.tipoDoc,
    numero_doc: cliente.numeroDoc,
    razon_social: cliente.razonSocial,
  };
}

function toApiMovimiento(row) {
  if (!row) return null;
  return {
    id: row.id,
    company_ruc: row.companyRuc,
    almacen_id: row.almacenId,
    tipo: row.tipo,
    fecha: toApiTimestamp(row.fecha),
    observaciones: row.observaciones,
    referencia_tipo: row.referenciaTipo,
    referencia_id: row.referenciaId,
    numero: row.numero,
    almacen_destino_id: row.almacenDestinoId,
    estado: row.estado,
    comprobante_id: row.comprobanteId,
    guia_remision_id: row.guiaRemisionId,
    fecha_despacho: toApiTimestamp(row.fechaDespacho),
    cliente_id: row.clienteId || undefined,
    cliente: toApiCliente(row.cliente),
    lineas: (row.lineas || []).map(toApiLinea),
  };
}

const movimientoInclude = {
  lineas: {
    include: { productoSerie: true },
    orderBy: { lineaId: 'asc' },
  },
  cliente: {
    select: { tipoDoc: true, numeroDoc: true, razonSocial: true },
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

async function nextNumeroSalida(companyRuc, tx) {
  const client = tx || prisma;
  const count = await client.movimiento.count({
    where: { companyRuc, tipo: 'SALIDA' },
  });
  return `ENT-${String(count + 1).padStart(4, '0')}`;
}

async function findMany({ companyRuc, tipo = null, almacenId = null }) {
  const where = { companyRuc };
  if (tipo) where.tipo = tipo;
  if (almacenId) where.almacenId = almacenId;

  const rows = await prisma.movimiento.findMany({
    where,
    include: movimientoInclude,
  });

  rows.sort((a, b) => compareStoredTimestamps(b.fecha, a.fecha));

  return rows.map(toApiMovimiento);
}

/** Entregas (salida a cliente) y devoluciones registradas para un cliente. */
async function findByCliente({ companyRuc, clienteId, almacenId = null }) {
  const id = (clienteId || '').trim();
  if (!id) return [];

  const where = {
    companyRuc,
    clienteId: id,
    OR: [
      { tipo: 'SALIDA', almacenDestinoId: null },
      { tipo: 'ENTRADA', referenciaTipo: 'DEVOLUCION_CLIENTE' },
    ],
  };
  if (almacenId) where.almacenId = almacenId;

  const rows = await prisma.movimiento.findMany({
    where,
    include: movimientoInclude,
  });

  rows.sort((a, b) => compareStoredTimestamps(b.fecha, a.fecha));

  return rows.map(toApiMovimiento);
}

async function registrarEntrada({
  companyRuc,
  almacenId,
  lineas,
  observaciones = null,
  clienteId = null,
  cliente = null,
}) {
  const almacen = await prisma.almacen.findFirst({
    where: { id: almacenId, companyRuc },
  });
  if (!almacen) return { error: 'almacen_not_found' };

  let resolvedClienteId = null;
  let esDevolucion = false;

  const quiereDevolucion = Boolean(
    (clienteId || '').trim() || (cliente && typeof cliente === 'object'),
  );

  if (quiereDevolucion) {
    const resolved = await clienteModel.resolveForSalida({
      companyRuc,
      clienteId,
      clienteBody: cliente,
    });
    if (resolved.error) return { error: resolved.error };
    if (!resolved.clienteId) return { error: 'cliente_requerido' };
    resolvedClienteId = resolved.clienteId;
    esDevolucion = true;
  }

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

    if (lineaUsaSeries(item, linea)) {
      const numeros = linea.numerosSerie;
      const ids = linea.serieIds;
      const countSeries = ids.length || numeros.length;
      if (countSeries === 0) {
        return { error: 'series_requeridas', catalogItemId: linea.catalogItemId };
      }
      if (linea.cantidad <= 0) linea.cantidad = countSeries;
      if (linea.cantidad !== countSeries) {
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
  const fecha = toStoredTimestamp();
  const lineasCreate = [];
  try {
    await prisma.$transaction(async (tx) => {
      const numero = await nextNumeroEntrada(companyRuc, tx);

      for (const linea of parsedLineas) {
        const item = itemsById.get(linea.catalogItemId);
        const ingresaSeries = lineaUsaSeries(item, linea);
        const afectaSaldo = usaInventarioCantidad(item, linea);

        if (ingresaSeries) {
          const numeros = linea.numerosSerie;
          const ids = linea.serieIds;
          const serieIdsProcesados = [];

          if (esDevolucion) {
            const seriesAReturn = [];

            if (ids.length > 0) {
              for (const serieId of ids) {
                const serie = await tx.productoSerie.findFirst({
                  where: {
                    id: serieId,
                    companyRuc,
                    catalogItemId: item.id,
                    estado: 'ENTREGADO',
                  },
                });
                if (!serie) {
                  const err = new Error('Serie no entregada o no encontrada');
                  err.code = 'serie_no_entregada';
                  err.numeroSerie = serieId;
                  throw err;
                }
                seriesAReturn.push(serie);
              }
            } else {
              for (const numeroSerie of numeros) {
                const serie = await tx.productoSerie.findFirst({
                  where: { companyRuc, numeroSerie, catalogItemId: item.id },
                });
                if (!serie || serie.estado !== 'ENTREGADO') {
                  const err = new Error(`La serie ${numeroSerie} no está entregada`);
                  err.code = 'serie_no_entregada';
                  err.numeroSerie = numeroSerie;
                  throw err;
                }
                seriesAReturn.push(serie);
              }
            }

            for (const serie of seriesAReturn) {
              if (!serie.entregaId) {
                const err = new Error(`La serie ${serie.numeroSerie} no tiene entrega asociada`);
                err.code = 'serie_no_de_cliente';
                err.numeroSerie = serie.numeroSerie;
                throw err;
              }
              const entrega = await tx.movimiento.findFirst({
                where: {
                  id: serie.entregaId,
                  companyRuc,
                  tipo: 'SALIDA',
                  clienteId: resolvedClienteId,
                },
              });
              if (!entrega) {
                const err = new Error(`La serie ${serie.numeroSerie} no corresponde a este cliente`);
                err.code = 'serie_no_de_cliente';
                err.numeroSerie = serie.numeroSerie;
                throw err;
              }

              await tx.productoSerie.update({
                where: { id: serie.id },
                data: {
                  estado: 'DISPONIBLE',
                  almacenId: almacenId,
                  entregaId: null,
                },
              });

              if (item.kind === 'PRODUCT') {
                await tx.inventario.upsert({
                  where: { productoSerieId: serie.id },
                  create: {
                    companyRuc,
                    catalogItemId: item.id,
                    almacenId: almacenId,
                    productoSerieId: serie.id,
                    cantidad: 1,
                  },
                  update: {
                    catalogItemId: item.id,
                    almacenId: almacenId,
                    cantidad: 1,
                  },
                });
              }

              serieIdsProcesados.push(serie.id);
            }

            lineasCreate.push(
              snapshotLineaFromItem(item, {
                almacenId: almacenId,
                cantidad: seriesAReturn.length,
                productoSerieId:
                  serieIdsProcesados.length === 1 ? serieIdsProcesados[0] : null,
                numerosSerie: seriesAReturn.map((s) => s.numeroSerie),
                serieIds: serieIdsProcesados,
              }),
            );
          } else {
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
                almacenId: almacenId,
                estado: 'DISPONIBLE',
              },
            });

            if (item.kind === 'PRODUCT') {
              await tx.inventario.create({
                data: {
                  companyRuc,
                  catalogItemId: item.id,
                  almacenId: almacenId,
                  productoSerieId: serieId,
                  cantidad: 1,
                },
              });
            }

            serieIdsCreados.push(serieId);
          }

          if (!usaSeriesInventario(item)) {
            await tx.catalogItem.update({
              where: { id: item.id },
              data: { manejaSerie: true, manejaStock: true },
            });
          }

          lineasCreate.push(
            snapshotLineaFromItem(
              { ...item, manejaSerie: true, manejaStock: true },
              {
                almacenId: almacenId,
                cantidad: numeros.length,
                productoSerieId: serieIdsCreados.length === 1 ? serieIdsCreados[0] : null,
                numerosSerie: numeros,
                serieIds: serieIdsCreados,
              },
            ),
          );
          }
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
              almacenId: almacenId,
              saldoKey: key,
              cantidad: nueva,
            },
            update: { cantidad: nueva },
          });

          if (!item.manejaStock) {
            await tx.catalogItem.update({
              where: { id: item.id },
              data: { manejaStock: true },
            });
          }

          lineasCreate.push(
            snapshotLineaFromItem(item, {
              almacenId: almacenId,
              cantidad: linea.cantidad,
              numerosSerie: [],
              serieIds: [],
            }),
          );
        } else {
          lineasCreate.push(
            snapshotLineaFromItem(item, {
              almacenId: almacenId,
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
          almacenId: almacenId,
          tipo: 'ENTRADA',
          fecha,
          observaciones: observaciones?.trim() || null,
          referenciaTipo: esDevolucion ? 'DEVOLUCION_CLIENTE' : 'INGRESO_MANUAL',
          numero,
          estado: 'DESPACHADA',
          clienteId: esDevolucion ? resolvedClienteId : null,
          lineas: {
            create: lineasCreate,
          },
        },
      });
    });
  } catch (err) {
    if (err.code === 'almacen_not_found') {
      return { error: 'almacen_not_found' };
    }
    if (err.code === 'serie_existente') {
      return { error: 'serie_existente', numeroSerie: err.numeroSerie };
    }
    if (err.code === 'serie_no_entregada') {
      return { error: 'serie_no_entregada', numeroSerie: err.numeroSerie };
    }
    if (err.code === 'serie_no_de_cliente') {
      return { error: 'serie_no_de_cliente', numeroSerie: err.numeroSerie };
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

async function resolverSeriesSalida(tx, { companyRuc, almacenId, catalogItemId, linea }) {
  const ids = linea.serieIds;
  if (ids.length > 0) {
    const series = await tx.productoSerie.findMany({
      where: {
        id: { in: ids },
        companyRuc,
        catalogItemId,
        almacenId,
        estado: 'DISPONIBLE',
      },
    });
    if (series.length !== ids.length) {
      const err = new Error('Una o más series no están disponibles en el almacén');
      err.code = 'series_no_disponibles';
      throw err;
    }
    return series;
  }

  const numeros = linea.numerosSerie;
  if (numeros.length === 0) return [];

  const series = [];
  for (const numeroSerie of numeros) {
    const row = await tx.productoSerie.findFirst({
      where: {
        companyRuc,
        catalogItemId,
        almacenId,
        numeroSerie,
        estado: 'DISPONIBLE',
      },
    });
    if (!row) {
      const err = new Error(`Serie ${numeroSerie} no disponible en el almacén`);
      err.code = 'series_no_disponibles';
      err.numeroSerie = numeroSerie;
      throw err;
    }
    series.push(row);
  }
  return series;
}

async function registrarSalida({
  companyRuc,
  almacenId,
  almacenDestinoId = null,
  lineas,
  comprobanteId = null,
  guiaRemisionId = null,
  observaciones = null,
  clienteId = null,
  cliente = null,
}) {
  const esTraslado = Boolean(almacenDestinoId);

  const almacen = await prisma.almacen.findFirst({
    where: { id: almacenId, companyRuc },
  });
  if (!almacen) return { error: 'almacen_not_found' };

  if (esTraslado) {
    if (!almacenDestinoId) {
      return { error: 'almacen_destino_requerido' };
    }
    if (almacenDestinoId === almacenId) {
      return { error: 'mismo_almacen' };
    }
    const destino = await prisma.almacen.findFirst({
      where: { id: almacenDestinoId, companyRuc },
    });
    if (!destino) return { error: 'almacen_destino_not_found' };
  }

  let resolvedClienteId = null;
  if (!esTraslado) {
    const resolved = await clienteModel.resolveForSalida({
      companyRuc,
      clienteId,
      clienteBody: cliente,
    });
    if (resolved.error) return { error: resolved.error };
    resolvedClienteId = resolved.clienteId;

    if (!resolvedClienteId && comprobanteId) {
      const comprobante = await prisma.invoice.findFirst({
        where: { id: comprobanteId, companyRuc },
        select: { clienteId: true },
      });
      resolvedClienteId = comprobante?.clienteId || null;
    }

    if (!resolvedClienteId && !comprobanteId) {
      return { error: 'cliente_requerido' };
    }
  }
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

    const usaSeries = lineaUsaSeries(item, linea);

    if (usaSeries) {
      const countSeries = linea.serieIds.length || linea.numerosSerie.length;
      if (countSeries === 0) {
        return { error: 'series_requeridas', catalogItemId: linea.catalogItemId };
      }
      if (linea.cantidad <= 0) linea.cantidad = countSeries;
      if (linea.cantidad !== countSeries) {
        return { error: 'cantidad_series', catalogItemId: linea.catalogItemId };
      }
    } else if (linea.cantidad <= 0) {
      return { error: 'cantidad_invalida', catalogItemId: linea.catalogItemId };
    } else if (usaInventarioCantidad(item, linea)) {
      const actual = await inventarioModel.getCantidadEnAlmacen(linea.catalogItemId, almacenId);
      if (actual < linea.cantidad) {
        return {
          error: 'stock_insuficiente',
          catalogItemId: linea.catalogItemId,
          cantidad_actual: actual,
        };
      }
    }
  }

  const movimientoId = randomUUID();
  const fecha = toStoredTimestamp();
  const lineasCreate = [];

  try {
    await prisma.$transaction(async (tx) => {
      const numero = await nextNumeroSalida(companyRuc, tx);

      for (const linea of parsedLineas) {
        const item = itemsById.get(linea.catalogItemId);
        const usaSeries = lineaUsaSeries(item, linea);

        if (usaSeries) {
          const series = await resolverSeriesSalida(tx, {
            companyRuc,
            almacenId,
            catalogItemId: item.id,
            linea,
          });

          const serieIds = [];
          const numeros = [];

          for (const serie of series) {
            serieIds.push(serie.id);
            numeros.push(serie.numeroSerie);

            if (esTraslado) {
              await tx.productoSerie.update({
                where: { id: serie.id },
                data: { almacenId: almacenDestinoId },
              });
              await tx.inventario.updateMany({
                where: { productoSerieId: serie.id },
                data: { almacenId: almacenDestinoId },
              });
            } else {
              await tx.productoSerie.update({
                where: { id: serie.id },
                data: {
                  estado: 'ENTREGADO',
                  entregaId: movimientoId,
                },
              });
              await tx.inventario.deleteMany({ where: { productoSerieId: serie.id } });
            }
          }

          lineasCreate.push(
            snapshotLineaFromItem(item, {
              almacenId,
              cantidad: series.length,
              productoSerieId: serieIds.length === 1 ? serieIds[0] : null,
              numerosSerie: numeros,
              serieIds,
            }),
          );
        } else if (usaInventarioCantidad(item, linea)) {
          const key = inventarioModel.saldoKey(item.id, almacenId);
          const actualRow = await tx.inventario.findUnique({
            where: { saldoKey: key },
            select: { cantidad: true },
          });
          const actual = toNumber(actualRow?.cantidad);
          const nueva = actual - linea.cantidad;
          if (nueva < 0) {
            const err = new Error('Stock insuficiente');
            err.code = 'stock_insuficiente';
            err.catalogItemId = item.id;
            err.cantidad_actual = actual;
            throw err;
          }

          if (nueva === 0) {
            await tx.inventario.deleteMany({ where: { saldoKey: key } });
          } else {
            await tx.inventario.update({
              where: { saldoKey: key },
              data: { cantidad: nueva },
            });
          }

          if (esTraslado) {
            const keyDest = inventarioModel.saldoKey(item.id, almacenDestinoId);
            const destRow = await tx.inventario.findUnique({
              where: { saldoKey: keyDest },
              select: { cantidad: true },
            });
            const destActual = toNumber(destRow?.cantidad);
            const destNueva = destActual + linea.cantidad;

            await tx.inventario.upsert({
              where: { saldoKey: keyDest },
              create: {
                companyRuc,
                catalogItemId: item.id,
                almacenId: almacenDestinoId,
                saldoKey: keyDest,
                cantidad: destNueva,
              },
              update: { cantidad: destNueva },
            });
          }

          if (!item.manejaStock) {
            await tx.catalogItem.update({
              where: { id: item.id },
              data: { manejaStock: true },
            });
          }

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
          almacenDestinoId: esTraslado ? almacenDestinoId : null,
          tipo: 'SALIDA',
          fecha,
          observaciones: observaciones?.trim() || null,
          referenciaTipo: esTraslado ? 'TRASLADO' : 'SALIDA_MANUAL',
          numero,
          estado: 'DESPACHADA',
          comprobanteId: comprobanteId || null,
          guiaRemisionId: guiaRemisionId || null,
          fechaDespacho: fecha,
          clienteId: esTraslado ? null : resolvedClienteId,
          lineas: {            create: lineasCreate,
          },
        },
      });
    });
  } catch (err) {
    if (err.code === 'series_no_disponibles') {
      return {
        error: 'series_no_disponibles',
        numeroSerie: err.numeroSerie,
      };
    }
    if (err.code === 'stock_insuficiente') {
      return {
        error: 'stock_insuficiente',
        catalogItemId: err.catalogItemId,
        cantidad_actual: err.cantidad_actual,
      };
    }
    console.error('[registrarSalida]', err);
    throw err;
  }

  const movimiento = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    include: movimientoInclude,
  });

  return { movimiento: toApiMovimiento(movimiento) };
}

async function registrarMovimiento({ companyRuc, tipo, ...params }) {
  const normalized = String(tipo || '').trim().toUpperCase();

  if (normalized === 'ENTRADA') {
    return registrarEntrada({ companyRuc, ...params });
  }
  if (normalized === 'SALIDA') {
    return registrarSalida({ companyRuc, ...params });
  }

  return { error: 'tipo_invalido' };
}

module.exports = {
  toApiMovimiento,
  toApiLinea,
  findMany,
  findByCliente,
  registrarEntrada,
  registrarSalida,
  registrarMovimiento,
};