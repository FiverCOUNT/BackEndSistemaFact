const prisma = require('../config/prisma');

const TIPO_DOC_LABEL = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota crédito',
  '08': 'Nota débito',
  '09': 'Guía remisión',
};

function formatMoney(value) {
  if (value == null) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toPublic(invoice) {
  if (!invoice) return null;
  const doc = `${invoice.serie}-${invoice.correlativo}`;
  return {
    id: invoice.id,
    companyRuc: invoice.companyRuc,
    tipoDoc: invoice.tipoDoc,
    tipoDocLabel: TIPO_DOC_LABEL[invoice.tipoDoc] || invoice.tipoDoc,
    serie: invoice.serie,
    correlativo: invoice.correlativo,
    numero: doc,
    fechaEmision: invoice.fechaEmision,
    estado: invoice.estado,
    tipoMoneda: invoice.tipoMoneda,
    total: formatMoney(invoice.mtoImpVenta),
    clienteNombre: invoice.cliente?.razonSocial || '—',
    clienteDoc: invoice.cliente?.numeroDoc,
  };
}

async function findAll() {
  const rows = await prisma.invoice.findMany({
    include: {
      cliente: { select: { razonSocial: true, numeroDoc: true, tipoDoc: true } },
    },
    orderBy: [{ fechaEmision: 'desc' }, { serie: 'asc' }, { correlativo: 'desc' }],
  });
  return rows.map(toPublic);
}

module.exports = { findAll, toPublic };
