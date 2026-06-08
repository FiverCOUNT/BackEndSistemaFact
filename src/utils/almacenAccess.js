/**
 * Lectura y validación de almacén en solicitudes API móvil.
 * Acepta `almacen_id` (snake) y `almacenId` (camel) en query y body.
 */

function normalizeAlmacenId(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function readAlmacenFromQuery(req) {
  return normalizeAlmacenId(req.query?.almacen_id ?? req.query?.almacenId);
}

function readAlmacenFromBody(req) {
  return normalizeAlmacenId(req.body?.almacen_id ?? req.body?.almacenId);
}

function assertCanAccessAlmacen(req, almacenId) {
  if (!almacenId || req.userRol === 'ADMIN') return;

  const userAlm = normalizeAlmacenId(req.userAlmacenId);
  if (!userAlm) {
    const err = new Error('Usuario sin almacén asignado');
    err.status = 403;
    throw err;
  }
  if (almacenId !== userAlm) {
    const err = new Error('No puede operar en otro almacén');
    err.status = 403;
    throw err;
  }
}

/**
 * POST/PUT/PATCH: exige almacen_id o almacenId en body (o usa el del usuario si no es ADMIN).
 */
function resolveAlmacenFromBody(req, { required = true, defaultToUser = true } = {}) {
  let almacenId = readAlmacenFromBody(req);

  if (!almacenId && defaultToUser && req.userRol !== 'ADMIN') {
    almacenId = normalizeAlmacenId(req.userAlmacenId);
  }

  if (!almacenId && required) {
    const err = new Error('almacen_id es obligatorio');
    err.status = 400;
    throw err;
  }

  if (almacenId) assertCanAccessAlmacen(req, almacenId);
  return almacenId;
}

/**
 * GET: lee almacen_id / almacenId del query y valida acceso.
 */
function resolveAlmacenFromQuery(req, { required = false } = {}) {
  let almacenId = readAlmacenFromQuery(req);

  if (!almacenId && req.userRol !== 'ADMIN') {
    almacenId = normalizeAlmacenId(req.userAlmacenId);
  }

  if (!almacenId && required) {
    const err = new Error('Query almacen_id es obligatorio');
    err.status = 400;
    throw err;
  }

  if (almacenId) assertCanAccessAlmacen(req, almacenId);
  return almacenId;
}

module.exports = {
  normalizeAlmacenId,
  readAlmacenFromQuery,
  readAlmacenFromBody,
  assertCanAccessAlmacen,
  resolveAlmacenFromBody,
  resolveAlmacenFromQuery,
};
