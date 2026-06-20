const { normalizeAlmacenId, readAlmacenFromQuery } = require('./almacenAccess');

function resolveCatalogQuery(req) {
  const queryAlmacen = readAlmacenFromQuery(req);

  if (req.userRol === 'ADMIN') {
    return {
      almacenId: queryAlmacen || normalizeAlmacenId(req.userAlmacenId),
      restrictToAlmacen: false,
    };
  }

  const userAlm = normalizeAlmacenId(req.userAlmacenId);
  if (!userAlm) {
    const err = new Error('Usuario sin almacén asignado');
    err.status = 403;
    throw err;
  }

  if (queryAlmacen && queryAlmacen !== userAlm) {
    const err = new Error('No puede consultar otro almacén');
    err.status = 403;
    throw err;
  }

  // Catálogo completo de la empresa; el stock se calcula solo en su almacén (0 si no hay).
  return { almacenId: userAlm, restrictToAlmacen: false };
}

module.exports = { resolveCatalogQuery };
