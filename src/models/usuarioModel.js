const prisma = require('../config/prisma');

const ROLES = ['ADMIN', 'USUARIO'];

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    estado: user.estado,
    rol: user.rol,
    companyId: user.companyId ? user.companyId.toString() : null,
    almacenId: user.almacenId != null ? String(user.almacenId) : null,
    almacenNombre: user.almacen?.nombre ?? null,
    almacenCodigo: user.almacen?.codigo ?? null,
    lastUpdated: user.lastUpdated.toString(),
  };
}

async function findByEmail(email) {
  const trimmed = (email || '').trim();
  const normalized = trimmed.toLowerCase();
  const include = {
    company: { select: { id: true, nombre: true, ruc: true } },
    almacen: { select: { id: true, nombre: true, codigo: true, companyRuc: true } },
  };

  let user = await prisma.usuario.findUnique({
    where: { email: normalized },
    include,
  });

  if (!user && trimmed !== normalized) {
    user = await prisma.usuario.findUnique({
      where: { email: trimmed },
      include,
    });
  }

  return user;
}

async function findByEmailExceptId(email, id) {
  return prisma.usuario.findFirst({
    where: { email, NOT: { id } },
  });
}

async function findById(id) {
  return prisma.usuario.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, nombre: true, ruc: true } },
      almacen: { select: { id: true, nombre: true, codigo: true, companyRuc: true } },
    },
  });
}

async function findByRefreshToken(refreshToken) {
  return prisma.usuario.findFirst({
    where: { refreshToken },
    include: {
      company: { select: { id: true, nombre: true, ruc: true } },
      almacen: { select: { id: true, nombre: true, codigo: true, companyRuc: true } },
    },
  });
}

function buildSearchWhere(q) {
  const term = (q || '').trim();
  if (!term) return {};

  const or = [
    { email: { contains: term } },
    { company: { is: { nombre: { contains: term } } } },
    { company: { is: { ruc: { contains: term } } } },
    { almacen: { is: { nombre: { contains: term } } } },
  ];

  const id = Number(term);
  if (Number.isInteger(id) && id > 0) {
    or.push({ id });
  }

  const estado = term.toUpperCase();
  if (['ACTIVO', 'INACTIVO', 'PENDIENTE', 'BLOQUEADO'].includes(estado)) {
    or.push({ estado });
  }

  const rol = term.toUpperCase();
  if (ROLES.includes(rol)) {
    or.push({ rol });
  }

  return { OR: or };
}

function mapListRow(row) {
  return {
    ...toPublicUser(row),
    companyNombre: row.company?.nombre ?? null,
    companyRuc: row.company?.ruc ?? null,
    hasSession: Boolean(row.token),
  };
}

async function findPaginated({ q = '', page = 1, pageSize = 25, skip = 0 }) {
  const where = buildSearchWhere(q);

  const [total, rows] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      orderBy: { id: 'asc' },
      skip,
      take: pageSize,
      include: {
        company: { select: { id: true, nombre: true, ruc: true } },
        almacen: { select: { id: true, nombre: true, codigo: true } },
      },
    }),
  ]);

  return { total, items: rows.map(mapListRow) };
}

async function create({ email, contrasenaHash, companyId, estado, rol, almacenId }) {
  const row = await prisma.usuario.create({
    data: {
      email,
      contrasena: contrasenaHash,
      lastUpdated: BigInt(Date.now()),
      estado: estado || 'ACTIVO',
      rol: rol || 'USUARIO',
      ...(companyId !== undefined && companyId !== null && { companyId: BigInt(companyId) }),
      ...(almacenId ? { almacenId } : {}),
    },
  });
  return row;
}

async function update(id, data) {
  const { email, contrasenaHash, companyId, estado, rol, almacenId } = data;
  const patch = {
    ...(email !== undefined && { email }),
    ...(estado !== undefined && { estado }),
    ...(rol !== undefined && { rol }),
    ...(companyId !== undefined && {
      companyId: companyId ? BigInt(companyId) : null,
    }),
    ...(almacenId !== undefined && {
      almacenId: almacenId || null,
    }),
    lastUpdated: BigInt(Date.now()),
  };

  if (typeof contrasenaHash === 'string' && contrasenaHash.length > 0) {
    patch.contrasena = contrasenaHash;
  }

  return prisma.usuario.update({
    where: { id },
    data: patch,
  });
}

async function setEstado(id, estado) {
  const data = {
    estado,
    lastUpdated: BigInt(Date.now()),
  };

  if (estado !== 'ACTIVO') {
    Object.assign(data, { token: null, refreshToken: null });
  }

  return prisma.usuario.update({ where: { id }, data });
}

async function remove(id) {
  return prisma.usuario.delete({ where: { id } });
}

async function saveTokens(id, { token, refreshToken }) {
  return prisma.usuario.update({
    where: { id },
    data: {
      token,
      refreshToken,
      lastUpdated: BigInt(Date.now()),
    },
  });
}

async function clearTokens(id) {
  return prisma.usuario.update({
    where: { id },
    data: {
      token: null,
      refreshToken: null,
      lastUpdated: BigInt(Date.now()),
    },
  });
}

module.exports = {
  ROLES,
  toPublicUser,
  findByEmail,
  findByEmailExceptId,
  findById,
  findByRefreshToken,
  findPaginated,
  create,
  update,
  setEstado,
  remove,
  saveTokens,
  clearTokens,
};
