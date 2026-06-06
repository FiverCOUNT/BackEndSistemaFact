const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');

function toPublic(company) {
  if (!company) return null;
  return {
    id: company.id.toString(),
    ruc: company.ruc,
    nombre: company.nombre,
    nombreComercial: company.nombreComercial,
    tipoDoc: company.tipoDoc,
    numeroDoc: company.numeroDoc,
    email: company.email,
    telefono: company.telefono,
    entorno: company.entorno,
    plan: company.plan,
    taxRegime: company.taxRegime,
    activo: company.activo,
    isActive: company.isActive,
    creadoEn: company.creadoEn,
    addressId: company.addressId,
    usuariosCount: company._count?.usuarios ?? 0,
    address: company.address
      ? {
          ubigeo: company.address.ubigeo,
          departamento: company.address.departamento,
          provincia: company.address.provincia,
          distrito: company.address.distrito,
          direccion: company.address.direccion,
          codLocal: company.address.codLocal,
        }
      : null,
  };
}

function buildAddressData(body) {
  const ubigeo = (body.ubigeo || '').trim();
  const direccion = (body.direccion || '').trim();
  if (!ubigeo && !direccion && !body.departamento) return null;

  return {
    id: randomUUID(),
    ubigeo: ubigeo || null,
    departamento: (body.departamento || '').trim() || null,
    provincia: (body.provincia || '').trim() || null,
    distrito: (body.distrito || '').trim() || null,
    direccion: direccion || null,
    codLocal: (body.codLocal || '0000').trim() || '0000',
  };
}

function buildCompanyData(body) {
  return {
    ruc: (body.ruc || '').trim(),
    nombre: (body.nombre || '').trim(),
    nombreComercial: (body.nombreComercial || '').trim() || null,
    tipoDoc: (body.tipoDoc || '').trim() || null,
    numeroDoc: (body.numeroDoc || '').trim() || null,
    email: (body.email || '').trim() || null,
    telefono: (body.telefono || '').trim() || null,
    entorno: (body.entorno || '').trim() || null,
    plan: (body.plan || '').trim() || null,
    taxRegime: (body.taxRegime || '').trim() || null,
    creadoEn: (body.creadoEn || '').trim() || null,
    activo: body.activo === 'on' || body.activo === 'true' || body.activo === true,
    isActive: body.isActive === 'on' || body.isActive === 'true' || body.isActive === true,
  };
}

function buildSearchWhere(q) {
  const term = (q || '').trim();
  if (!term) return {};

  const or = [
    { ruc: { contains: term } },
    { nombre: { contains: term } },
    { nombreComercial: { contains: term } },
    { email: { contains: term } },
    { telefono: { contains: term } },
    { numeroDoc: { contains: term } },
    { entorno: { contains: term } },
  ];

  return { OR: or };
}

async function findPaginated({ q = '', page = 1, pageSize = 25, skip = 0 }) {
  const where = buildSearchWhere(q);

  const [total, rows] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: { id: 'asc' },
      skip,
      take: pageSize,
      include: {
        address: true,
        _count: { select: { usuarios: true } },
      },
    }),
  ]);

  return { total, items: rows.map(toPublic) };
}

async function findById(id) {
  return prisma.company.findUnique({
    where: { id: BigInt(id) },
    include: { address: true, _count: { select: { usuarios: true } } },
  });
}

async function findByRuc(ruc) {
  return prisma.company.findFirst({ where: { ruc } });
}

async function findByRucExceptId(ruc, id) {
  return prisma.company.findFirst({
    where: { ruc, NOT: { id: BigInt(id) } },
  });
}

async function create(body) {
  const companyData = buildCompanyData(body);
  const addressData = buildAddressData(body);

  return prisma.$transaction(async (tx) => {
    if (addressData) {
      await tx.address.create({ data: addressData });
      companyData.addressId = addressData.id;
    }
    const row = await tx.company.create({ data: companyData });
    return tx.company.findUnique({
      where: { id: row.id },
      include: { address: true },
    });
  });
}

async function update(id, body) {
  const companyData = buildCompanyData(body);
  const addressData = buildAddressData(body);
  const existing = await prisma.company.findUnique({
    where: { id: BigInt(id) },
    include: { address: true },
  });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    if (addressData) {
      if (existing.addressId) {
        await tx.address.update({
          where: { id: existing.addressId },
          data: {
            ubigeo: addressData.ubigeo,
            departamento: addressData.departamento,
            provincia: addressData.provincia,
            distrito: addressData.distrito,
            direccion: addressData.direccion,
            codLocal: addressData.codLocal,
          },
        });
      } else {
        await tx.address.create({ data: addressData });
        companyData.addressId = addressData.id;
      }
    }

    return tx.company.update({
      where: { id: BigInt(id) },
      data: companyData,
      include: { address: true },
    });
  });
}

async function setActive(id, active) {
  return prisma.company.update({
    where: { id: BigInt(id) },
    data: { activo: active, isActive: active },
  });
}

async function remove(id) {
  const company = await prisma.company.findUnique({
    where: { id: BigInt(id) },
    include: { _count: { select: { usuarios: true } } },
  });
  if (!company) return { error: 'not_found' };
  if (company._count.usuarios > 0) return { error: 'has_users' };

  if (company.addressId) {
    await prisma.company.update({
      where: { id: BigInt(id) },
      data: { addressId: null },
    });
    await prisma.address.delete({ where: { id: company.addressId } });
  }

  await prisma.company.delete({ where: { id: BigInt(id) } });
  return { ok: true };
}

module.exports = {
  toPublic,
  buildCompanyData,
  findPaginated,
  findById,
  findByRuc,
  findByRucExceptId,
  create,
  update,
  setActive,
  remove,
};
