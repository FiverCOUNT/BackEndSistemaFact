const prisma = require('../src/config/prisma');

async function main() {
  const ruc = '22222222222';
  const items = await prisma.catalogItem.findMany({
    where: { companyRuc: ruc },
    select: { id: true, nombre: true, unidad: true, manejaStock: true, manejaSerie: true, kind: true },
  });
  console.log('catalog', items);
  const inv = await prisma.inventario.findMany({ where: { companyRuc: ruc } });
  for (const row of inv) {
    const item = items.find((i) => i.id === row.catalogItemId);
    console.log({
      product: item?.nombre,
      manejaStock: item?.manejaStock,
      manejaSerie: item?.manejaSerie,
      cantidad: String(row.cantidad),
      almacenId: row.almacenId,
      saldoKey: row.saldoKey,
    });
  }
  const traslados = await prisma.movimiento.findMany({
    where: { companyRuc: ruc, referenciaTipo: 'TRASLADO' },
    take: 5,
    include: { lineas: true },
    orderBy: { fecha: 'desc' },
  });
  console.log(
    'traslados',
    traslados.map((t) => ({
      numero: t.numero,
      dest: t.almacenDestinoId,
      lineas: t.lineas.map((l) => ({ cat: l.catalogItemId, qty: String(l.cantidad) })),
    })),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
