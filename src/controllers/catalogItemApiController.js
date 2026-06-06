const catalogItemModel = require('../models/catalogItemModel');
const { resolveCatalogQuery } = require('../utils/catalogAccess');

async function list(req, res, next) {
  try {
    const { almacenId, restrictToAlmacen } = resolveCatalogQuery(req);
    const items = await catalogItemModel.findByCompanyRuc(req.companyRuc, {
      almacenId,
      restrictToAlmacen,
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const body = { ...req.body, companyRuc: req.companyRuc };
    const parsed = catalogItemModel.parseBody(body);

    if (!parsed.nombre) {
      return res.status(400).json({ success: false, message: 'nombre es obligatorio' });
    }

    const row = await catalogItemModel.create(body);
    res.status(201).json(catalogItemModel.toApi(row));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await catalogItemModel.findById(id);
    if (!existing || existing.companyRuc !== req.companyRuc) {
      return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
    }

    const body = { ...req.body, companyRuc: req.companyRuc };
    const parsed = catalogItemModel.parseBody(body);
    if (!parsed.nombre) {
      return res.status(400).json({ success: false, message: 'nombre es obligatorio' });
    }

    const row = await catalogItemModel.update(id, body);
    res.json(catalogItemModel.toApi(row));
  } catch (err) {
    next(err);
  }
}

async function patch(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await catalogItemModel.findById(id);
    if (!existing || existing.companyRuc !== req.companyRuc) {
      return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
    }

    if (req.body.activo === undefined) {
      return res.status(400).json({ success: false, message: 'activo es requerido' });
    }

    const activo = req.body.activo === true || req.body.activo === 'true';
    const row = await catalogItemModel.setActive(id, activo);
    res.json(catalogItemModel.toApi(row));
  } catch (err) {
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await catalogItemModel.findById(id);
    if (!existing || existing.companyRuc !== req.companyRuc) {
      return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
    }

    const result = await catalogItemModel.remove(id);
    if (result.error === 'has_relations') {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar: tiene ventas, series o movimientos vinculados',
      });
    }

    res.json({ success: true, message: 'Ítem eliminado' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, patch, destroy };
