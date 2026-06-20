const prisma = require('../src/config/prisma');

async function main() {
  const count = await prisma.invoice.count();
  if (count === 0) {
    console.log('No hay comprobantes en la BD.');
    return;
  }

  console.log(`Eliminando ${count} comprobante(s)...`);

  await prisma.invoice.updateMany({ data: { documentoAfectadoId: null } });
  const deleted = await prisma.invoice.deleteMany();

  console.log(`Listo: ${deleted.count} comprobante(s) eliminados.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
