const prisma = require('../src/config/prisma');

async function main() {
  const count = await prisma.invoice.count();
  const rows = await prisma.invoice.findMany({
    take: 30,
    include: {
      cliente: { select: { razonSocial: true, numeroDoc: true } },
    },
  });
  rows.sort((a, b) => String(b.fechaEmision || '').localeCompare(String(a.fechaEmision || '')));
  console.log('total invoices:', count);
  for (const r of rows) {
    console.log({
      doc: `${r.tipoDoc} ${r.serie}-${r.correlativo}`,
      ruc: r.companyRuc,
      fecha: r.fechaEmision,
      estado: r.estado,
      sunat: r.sunatEstadoDirecto,
      codigo: r.sunatCodigoDirecto,
      desc: r.sunatDescripcionDirecto?.slice?.(0, 120) || null,
      cliente: r.cliente?.razonSocial,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
