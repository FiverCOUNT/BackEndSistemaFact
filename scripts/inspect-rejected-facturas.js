const prisma = require('../src/config/prisma');

async function main() {
  const rejected = await prisma.invoice.findMany({
    where: { tipoDoc: '01' },
    select: { id: true, serie: true, correlativo: true, estado: true, sunatJson: true, companyRuc: true },
  });
  for (const r of rejected) {
    const s = r.sunatJson || {};
    console.log('---', r.serie, r.correlativo, r.estado, r.companyRuc);
    console.log({
      success: s.success,
      estado: s.estado,
      descripcion: s.descripcion,
      mensaje: s.mensaje,
      error: s.error,
      codigo_cdr: s.codigo_cdr,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
