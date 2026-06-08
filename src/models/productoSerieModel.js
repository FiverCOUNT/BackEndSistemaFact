const prisma = require('../config/prisma');

function toApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    company_ruc: row.companyRuc,
    catalog_item_id: row.catalogItemId,
    numero_serie: row.numeroSerie,
    almacen_id: row.almacenId,
    estado: row.estado,
    comprobante_id: row.comprobanteId,
    entrega_id: row.entregaId,
  };
}

/**
 * Series DISPONIBLE de un ítem en un almacén (stock vivo vía inventario).
 */
async function findDisponibles({ companyRuc, catalogItemId, almacenId }) {
  const rows = await prisma.productoSerie.findMany({
    where: {
      companyRuc,
      catalogItemId,
      almacenId,
      estado: 'DISPONIBLE',
      OR: [
        {
          inventario: {
            is: {
              almacenId,
              cantidad: { gt: 0 },
            },
          },
        },
        { inventario: { is: null } },
      ],
    },
    include: { inventario: true },
    orderBy: { numeroSerie: 'asc' },
  });

  const sinInventario = rows.filter((row) => !row.inventario);
  if (sinInventario.length > 0) {
    await Promise.all(
      sinInventario.map((row) =>
        prisma.inventario.create({
          data: {
            companyRuc,
            catalogItemId: row.catalogItemId,
            almacenId: row.almacenId,
            productoSerieId: row.id,
            cantidad: 1,
          },
        }),
      ),
    );
  }

  return rows.map(toApi);
}

module.exports = {
  toApi,
  findDisponibles,
};
