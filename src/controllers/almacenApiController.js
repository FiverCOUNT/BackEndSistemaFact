const almacenModel = require('../models/almacenModel');

async function list(req, res, next) {
  try {
    const soloActivos = req.query.solo_activos !== 'false';
    const options = { soloActivos };

    if (req.userRol !== 'ADMIN') {
      if (!req.userAlmacenId) {
        return res.status(403).json({
          success: false,
          message: 'Usuario sin almacén asignado',
        });
      }
      options.almacenId = req.userAlmacenId;
    }

    const rows = await almacenModel.findByCompanyRuc(req.companyRuc, options);
    res.json(rows.map(almacenModel.toApi));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const body = { ...req.body, companyRuc: req.companyRuc, company_ruc: req.companyRuc };
    const parsed = almacenModel.parseBody(body);

    if (!parsed.codigo) {
      return res.status(400).json({ success: false, message: 'codigo es obligatorio' });
    }
    if (!parsed.nombre) {
      return res.status(400).json({ success: false, message: 'nombre es obligatorio' });
    }

    const duplicado = await almacenModel.findByCodigo(req.companyRuc, parsed.codigo);
    if (duplicado) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un almacén con ese código',
      });
    }

    const row = await almacenModel.create(body);
    res.status(201).json(almacenModel.toApi(row));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create };
