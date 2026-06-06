const prisma = require('../config/prisma');
const almacenModel = require('../models/almacenModel');
const { parseListQuery, buildPageMeta } = require('../utils/pagination');

async function loadCompanies() {
  return prisma.company.findMany({
    select: { ruc: true, nombre: true },
    orderBy: { nombre: 'asc' },
  });
}

function parseFlash(req) {
  const { msg, tipo } = req.query;
  if (!msg) return null;
  return { text: msg, type: tipo === 'error' ? 'error' : 'success' };
}

function parseId(param) {
  const id = (param || '').trim();
  if (!id || id.length < 8) return null;
  return id;
}

function redirectList(res, message, type = 'success') {
  const q = new URLSearchParams({ msg: message, tipo: type });
  return res.redirect(`/almacenes?${q.toString()}`);
}

function formFromBody(body) {
  const parsed = almacenModel.parseBody(body);
  return {
    companyRuc: parsed.companyRuc,
    codigo: parsed.codigo,
    nombre: parsed.nombre,
    activo: parsed.activo,
    ubigeo: body.ubigeo || '',
    departamento: body.departamento || '',
    provincia: body.provincia || '',
    distrito: body.distrito || '',
    direccion: body.direccion || '',
    codLocal: body.codLocal || '0000',
  };
}

function formFromAlmacen(almacen) {
  const a = almacenModel.toPublic(almacen);
  return {
    companyRuc: a.companyRuc,
    codigo: a.codigo,
    nombre: a.nombre,
    activo: a.activo,
    ubigeo: a.address?.ubigeo || '',
    departamento: a.address?.departamento || '',
    provincia: a.address?.provincia || '',
    distrito: a.address?.distrito || '',
    direccion: a.address?.direccion || '',
    codLocal: a.address?.codLocal || '0000',
  };
}

async function list(req, res, next) {
  try {
    const { q, page, pageSize, skip } = parseListQuery(req.query);
    const companyRuc = (req.query.company || '').trim();

    const { total, items } = await almacenModel.findPaginated({
      q,
      companyRuc,
      page,
      pageSize,
      skip,
    });

    const pagination = buildPageMeta({
      total,
      page,
      pageSize,
      basePath: '/almacenes',
      query: {
        q,
        company: companyRuc || undefined,
        msg: req.query.msg,
        tipo: req.query.tipo,
      },
    });

    const companies = await loadCompanies();

    res.render('almacenes/listar', {
      title: 'Almacenes',
      almacenes: items,
      total,
      q,
      companyRuc,
      pageSize,
      pagination,
      companies,
      flash: parseFlash(req),
      searchAction: '/almacenes',
      searchPlaceholder: 'Buscar por código, nombre, empresa o dirección…',
    });
  } catch (err) {
    next(err);
  }
}

async function showCreateForm(req, res, next) {
  try {
    const companies = await loadCompanies();
    res.render('almacenes/crear', {
      title: 'Nuevo almacén',
      error: null,
      companies,
      isEdit: false,
      form: { activo: true, codLocal: '0000' },
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const companies = await loadCompanies();
    const form = formFromBody(req.body);

    const renderError = (error) =>
      res.render('almacenes/crear', {
        title: 'Nuevo almacén',
        error,
        companies,
        isEdit: false,
        form,
      });

    if (!form.companyRuc) return renderError('Selecciona una empresa (RUC).');
    if (!form.codigo) return renderError('El código es obligatorio.');
    if (!form.nombre) return renderError('El nombre es obligatorio.');

    const company = await prisma.company.findFirst({ where: { ruc: form.companyRuc } });
    if (!company) return renderError('La empresa seleccionada no existe.');

    if (await almacenModel.findByCodigo(form.companyRuc, form.codigo)) {
      return renderError('Ya existe un almacén con ese código en la empresa.');
    }

    await almacenModel.create(req.body);
    return redirectList(res, `Almacén «${form.nombre}» creado.`);
  } catch (err) {
    next(err);
  }
}

async function showEditForm(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return redirectList(res, 'Almacén no válido', 'error');

    const almacen = await almacenModel.findById(id);
    if (!almacen) return redirectList(res, 'Almacén no encontrado', 'error');

    const companies = await loadCompanies();
    res.render('almacenes/editar', {
      title: 'Editar almacén',
      error: null,
      companies,
      isEdit: true,
      almacen: almacenModel.toPublic(almacen),
      form: formFromAlmacen(almacen),
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return redirectList(res, 'Almacén no válido', 'error');

    const almacen = await almacenModel.findById(id);
    if (!almacen) return redirectList(res, 'Almacén no encontrado', 'error');

    const companies = await loadCompanies();
    const form = formFromBody(req.body);

    const renderError = (error) =>
      res.render('almacenes/editar', {
        title: 'Editar almacén',
        error,
        companies,
        isEdit: true,
        almacen: almacenModel.toPublic(almacen),
        form,
      });

    if (!form.companyRuc) return renderError('Selecciona una empresa (RUC).');
    if (!form.codigo) return renderError('El código es obligatorio.');
    if (!form.nombre) return renderError('El nombre es obligatorio.');

    const company = await prisma.company.findFirst({ where: { ruc: form.companyRuc } });
    if (!company) return renderError('La empresa seleccionada no existe.');

    const duplicate = await almacenModel.findByCodigoExceptId(
      form.companyRuc,
      form.codigo,
      id,
    );
    if (duplicate) return renderError('Ya existe otro almacén con ese código en la empresa.');

    await almacenModel.update(id, req.body);
    return redirectList(res, `Almacén «${form.nombre}» actualizado.`);
  } catch (err) {
    next(err);
  }
}

async function activate(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return redirectList(res, 'Almacén no válido', 'error');

    const almacen = await almacenModel.findById(id);
    if (!almacen) return redirectList(res, 'Almacén no encontrado', 'error');

    await almacenModel.setActive(id, true);
    return redirectList(res, `«${almacen.nombre}» activado.`);
  } catch (err) {
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return redirectList(res, 'Almacén no válido', 'error');

    const almacen = await almacenModel.findById(id);
    if (!almacen) return redirectList(res, 'Almacén no encontrado', 'error');

    await almacenModel.setActive(id, false);
    return redirectList(res, `«${almacen.nombre}» desactivado.`);
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return redirectList(res, 'Almacén no válido', 'error');

    const almacen = await almacenModel.findById(id);
    if (!almacen) return redirectList(res, 'Almacén no encontrado', 'error');

    const result = await almacenModel.remove(id);
    if (result.error === 'has_relations') {
      return redirectList(
        res,
        'No se puede eliminar: tiene usuarios, series, movimientos o líneas vinculadas',
        'error',
      );
    }

    return redirectList(res, `«${almacen.nombre}» eliminado.`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  showCreateForm,
  create,
  showEditForm,
  update,
  activate,
  deactivate,
  destroy,
};
