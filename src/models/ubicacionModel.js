const prisma = require('../config/prisma');
const { toApiTimestamp } = require('../utils/fechas');

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

function clienteFromRow(cliente) {
  if (!cliente) return null;
  return {
    tipo_doc: cliente.tipoDoc,
    numero_doc: cliente.numeroDoc,
    razon_social: cliente.razonSocial,
  };
}

function clienteFromInvoice(invoice) {
  if (!invoice?.cliente) return null;
  return clienteFromRow(invoice.cliente);
}

function resolveOrigenDestino(mov) {
  if (mov.tipo === 'ENTRADA') {
    const clienteDev = mov.referenciaTipo === 'DEVOLUCION_CLIENTE' ? clienteFromRow(mov.cliente) : null;
    const origenNombre = clienteDev
      ? clienteDev.razon_social?.trim() || `Doc. ${clienteDev.numero_doc}`
      : 'Recepción externa';
    return {
      origenNombre,
      destinoNombre: mov.almacen?.nombre || 'Almacén',
      esTraslado: false,
    };
  }

  const origenNombre = mov.almacen?.nombre || 'Almacén';

  if (mov.almacenDestinoId) {
    return {
      origenNombre,
      destinoNombre: mov.almacenDestino?.nombre || 'Almacén destino',
      esTraslado: true,
    };
  }

  const cliente =
    clienteFromRow(mov.cliente) || clienteFromInvoice(mov.comprobante);

  const destinoNombre =
    cliente?.razon_social?.trim() ||
    (cliente?.numero_doc ? `Doc. ${cliente.numero_doc}` : null) ||
    'Cliente';

  return {
    origenNombre,
    destinoNombre,
    esTraslado: false,
  };
}

function extractSeriesFromLinea(linea) {
  const numero = linea.productoSerie?.numeroSerie;
  return numero ? [numero] : [];
}

function expandLineaToItems(linea, { serieFilter = null } = {}) {
  const mov = linea.movimiento;
  if (!mov) return [];

  const { origenNombre, destinoNombre, esTraslado } = resolveOrigenDestino(mov);
  const nombreProducto =
    linea.nombre || linea.catalogItem?.nombre || linea.catalogItemId || 'Producto';
  const unidad = linea.unidad || linea.catalogItem?.unidad || 'NIU';
  const fecha = toApiTimestamp(mov.fechaDespacho || mov.fecha);
  const base = {
    lineaId: linea.lineaId,
    movimientoId: mov.id,
    movimientoNumero: mov.numero,
    tipoMovimiento: mov.tipo,
    esTraslado,
    fecha,
    catalogItemId: linea.catalogItemId,
    catalogItemNombre: nombreProducto,
    unidad,
    origenNombre,
    destinoNombre,
  };

  let numeros = extractSeriesFromLinea(linea);
  if (serieFilter) {
    const ql = serieFilter.toLowerCase();
    numeros = numeros.filter((n) => n.toLowerCase().includes(ql));
    if (numeros.length === 0) return [];
  }

  if (numeros.length > 0) {
    return numeros.map((numeroSerie) =>
      toApiHistorialItem({
        ...base,
        id: `${linea.lineaId}:${numeroSerie}`,
        numeroSerie,
        cantidad: 1,
      }),
    );
  }

  if (serieFilter) return [];

  return [
    toApiHistorialItem({
      ...base,
      id: linea.lineaId,
      numeroSerie: linea.productoSerie?.numeroSerie || null,
      cantidad: toNumber(linea.cantidad) || 1,
    }),
  ];
}

function toApiHistorialItem(row) {
  return {
    id: row.id,
    linea_id: row.lineaId,
    movimiento_id: row.movimientoId,
    movimiento_numero: row.movimientoNumero,
    tipo_movimiento: row.tipoMovimiento,
    es_traslado: row.esTraslado,
    fecha: row.fecha,
    catalog_item_id: row.catalogItemId,
    catalog_item_nombre: row.catalogItemNombre,
    numero_serie: row.numeroSerie,
    cantidad: row.cantidad,
    unidad: row.unidad,
    origen_nombre: row.origenNombre,
    destino_nombre: row.destinoNombre,
  };
}

const lineaInclude = {
  catalogItem: { select: { id: true, nombre: true, unidad: true } },
  productoSerie: { select: { id: true, numeroSerie: true } },
  movimiento: {
    include: {
      almacen: { select: { id: true, nombre: true, codigo: true } },
      almacenDestino: { select: { id: true, nombre: true, codigo: true } },
      comprobante: {
        include: {
          cliente: { select: { tipoDoc: true, numeroDoc: true, razonSocial: true } },
        },
      },
      cliente: { select: { tipoDoc: true, numeroDoc: true, razonSocial: true } },
    },
  },
};

function buildMovimientoScope(companyRuc, almacenId) {
  const scope = { companyRuc };
  if (almacenId) {
    scope.OR = [{ almacenId }, { almacenDestinoId: almacenId }];
  }
  return scope;
}

async function loadLineas({ companyRuc, whereExtra, almacenId, take = 200 }) {
  return prisma.lineaCatalogoItem.findMany({
    where: {
      ...whereExtra,
      movimiento: buildMovimientoScope(companyRuc, almacenId),
    },
    include: lineaInclude,
    orderBy: { movimiento: { fecha: 'desc' } },
    take,
  });
}

function flattenAndSort(lineas, options = {}) {
  const items = lineas.flatMap((linea) => expandLineaToItems(linea, options));
  items.sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0));
  return items;
}

async function buscarPorSerie({ companyRuc, q, almacenId, limit = 50 }) {
  const series = await prisma.productoSerie.findMany({
    where: {
      companyRuc,
      numeroSerie: { contains: q },
    },
    select: { id: true, catalogItemId: true },
  });

  const serieIds = series.map((s) => s.id);
  const catalogItemIds = [...new Set(series.map((s) => s.catalogItemId))];

  const orFilters = [{ productoSerie: { companyRuc, numeroSerie: { contains: q } } }];
  if (serieIds.length > 0) {
    orFilters.push({ productoSerieId: { in: serieIds } });
  }

  const lineas = await loadLineas({
    companyRuc,
    almacenId,
    whereExtra: {
      OR: [
        ...orFilters,
        ...(catalogItemIds.length > 0
          ? [{ catalogItemId: { in: catalogItemIds }, manejaSerie: true }]
          : []),
      ],
    },
    take: 250,
  });

  return flattenAndSort(lineas, { serieFilter: q }).slice(0, limit);
}

async function buscarPorNombre({ companyRuc, q, almacenId, limit = 50 }) {
  const items = await prisma.catalogItem.findMany({
    where: {
      companyRuc,
      OR: [{ nombre: { contains: q } }, { codigo: { contains: q } }],
    },
    select: { id: true },
    take: 30,
  });

  if (items.length === 0) return [];

  const itemIds = items.map((i) => i.id);
  const lineas = await loadLineas({
    companyRuc,
    almacenId,
    whereExtra: { catalogItemId: { in: itemIds } },
    take: 250,
  });

  return flattenAndSort(lineas).slice(0, limit);
}

module.exports = {
  buscarPorSerie,
  buscarPorNombre,
};
