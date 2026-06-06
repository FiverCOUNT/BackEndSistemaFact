function resolveCatalogQuery(req) {
  const queryAlmacen = (req.query.almacen_id || '').trim() || null;

  if (req.userRol === 'ADMIN') {
    return { almacenId: queryAlmacen, restrictToAlmacen: false };
  }

  if (!req.userAlmacenId) {
    const err = new Error('Usuario sin almacén asignado');
    err.status = 403;
    throw err;
  }

  if (queryAlmacen && queryAlmacen !== req.userAlmacenId) {
    const err = new Error('No puede consultar otro almacén');
    err.status = 403;
    throw err;
  }

  return { almacenId: req.userAlmacenId, restrictToAlmacen: true };
}

module.exports = { resolveCatalogQuery };
