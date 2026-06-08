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

  return { almacenId: userAlm, restrictToAlmacen: true };
}

module.exports = { resolveCatalogQuery };
