require('../src/config/env');
const prisma = require('../src/config/prisma');

async function logDelete(label, fn) {
  const result = await fn();
  const count = result.count ?? result;
  console.log(`${label}: ${count}`);
  return result;
}

async function main() {
  console.log('Limpiando BD (conserva companies, usuarios, catalog_items)...\n');

  await logDelete('usuarios.almacenId limpiado', () =>
    prisma.usuario.updateMany({ data: { almacenId: null } }),
  );
  await logDelete('invoices.documentoAfectadoId limpiado', () =>
    prisma.invoice.updateMany({ data: { documentoAfectadoId: null } }),
  );
  await logDelete('sale_details', () => prisma.saleDetail.deleteMany());
  await logDelete('legends', () => prisma.legend.deleteMany());
  await logDelete('linea_catalogo_items', () => prisma.lineaCatalogoItem.deleteMany());
  await logDelete('inventario', () => prisma.inventario.deleteMany());
  await logDelete('movimientos', () => prisma.movimiento.deleteMany());
  await logDelete('producto_series', () => prisma.productoSerie.deleteMany());
  await logDelete('invoices', () => prisma.invoice.deleteMany());

  const clienteAddresses = await prisma.cliente.findMany({
    where: { addressId: { not: null } },
    select: { addressId: true },
  });
  const almacenAddresses = await prisma.almacen.findMany({
    where: { addressId: { not: null } },
    select: { addressId: true },
  });
  const orphanAddressIds = [
    ...new Set(
      [...clienteAddresses, ...almacenAddresses].map((row) => row.addressId).filter(Boolean),
    ),
  ];

  await logDelete('clientes', () => prisma.cliente.deleteMany());
  await logDelete('almacenes', () => prisma.almacen.deleteMany());

  if (orphanAddressIds.length) {
    await logDelete('addresses huerfanas', () =>
      prisma.address.deleteMany({ where: { id: { in: orphanAddressIds } } }),
    );
  } else {
    console.log('addresses huerfanas: 0');
  }

  await logDelete('catalog_items.stockActual reset', () =>
    prisma.catalogItem.updateMany({ data: { stockActual: null } }),
  );

  const kept = {
    companies: await prisma.company.count(),
    usuarios: await prisma.usuario.count(),
    catalog_items: await prisma.catalogItem.count(),
    addresses: await prisma.address.count(),
  };

  console.log('\nConservado:', kept);
  console.log('Listo.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
