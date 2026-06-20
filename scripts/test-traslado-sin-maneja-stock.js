const prisma = require('../src/config/prisma');
const movimientoModel = require('../src/models/movimientoModel');
const inventarioModel = require('../src/models/inventarioModel');

const ruc = '22222222222';
const product = '946fd1f1-bdbc-482e-b29f-7dd8a200c9f7';
const origen = '3d14a79d-605e-43a8-90fd-85493603206d';
const destino = 'f4d0cb14-285e-440f-bfe3-299ff6db191e';

async function cantidad(alm) {
  return inventarioModel.getCantidadEnAlmacen(product, alm);
}

async function main() {
  await prisma.catalogItem.update({
    where: { id: product },
    data: { manejaStock: false },
  });

  const antesOrigen = await cantidad(origen);
  const antesDestino = await cantidad(destino);
  console.log('ANTES origen', antesOrigen, 'destino', antesDestino, 'manejaStock=false');

  const result = await movimientoModel.registrarSalida({
    companyRuc: ruc,
    almacenId: origen,
    almacenDestinoId: destino,
    lineas: [{ catalog_item_id: product, cantidad: 2 }],
  });

  if (result.error) {
    console.log('ERROR', result);
    return;
  }

  const despuesOrigen = await cantidad(origen);
  const despuesDestino = await cantidad(destino);
  const item = await prisma.catalogItem.findUnique({ where: { id: product } });

  console.log('DESPUES origen', despuesOrigen, 'destino', despuesDestino);
  console.log('manejaStock ahora', item.manejaStock);
  console.log(
    despuesOrigen === antesOrigen - 2 && despuesDestino === antesDestino + 2
      ? 'OK inventario actualizado'
      : 'FALLO inventario no cambio',
  );

  await prisma.catalogItem.update({
    where: { id: product },
    data: { manejaStock: true },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
