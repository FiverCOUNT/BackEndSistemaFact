const prisma = require('../config/prisma');

const TIPO_DOC_LABEL = {
  '1': 'DNI',
  '6': 'RUC',
  '4': 'CE',
  '7': 'Pasaporte',
};

function toPublic(cliente) {
  if (!cliente) return null;
  return {
    id: cliente.id,
    companyRuc: cliente.companyRuc,
    tipoDoc: cliente.tipoDoc,
    tipoDocLabel: TIPO_DOC_LABEL[cliente.tipoDoc] || cliente.tipoDoc,
    numeroDoc: cliente.numeroDoc,
    razonSocial: cliente.razonSocial,
    telefono: cliente.telefono,
    activo: cliente.activo,
    comprobantesCount: cliente._count?.invoices ?? 0,
    distrito: cliente.address?.distrito,
    direccion: cliente.address?.direccion,
  };
}

function buildSearchWhere(q) {
  const term = (q || '').trim();
  if (!term) return {};

  return {
    OR: [
      { razonSocial: { contains: term } },
      { numeroDoc: { contains: term } },
      { companyRuc: { contains: term } },
      { telefono: { contains: term } },
      { tipoDoc: { contains: term } },
    ],
  };
}

async function findPaginated({ q = '', page = 1, pageSize = 25, skip = 0 }) {
  const where = buildSearchWhere(q);

  const [total, rows] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      include: {
        address: true,
        _count: { select: { invoices: true } },
      },
      orderBy: [{ companyRuc: 'asc' }, { razonSocial: 'asc' }],
      skip,
      take: pageSize,
    }),
  ]);

  return { total, items: rows.map(toPublic) };
}

module.exports = { findPaginated, toPublic };
