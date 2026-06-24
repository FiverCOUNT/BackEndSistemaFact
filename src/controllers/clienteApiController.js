const clienteModel = require('../models/clienteModel');

async function list(req, res, next) {
  try {
    const soloActivos = req.query.solo_activos !== 'false';
    const rows = await clienteModel.findAllByCompany(req.companyRuc, { soloActivos });
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const parsed = clienteModel.parseCreateBody(req.body);

    if (!parsed.numeroDoc) {
      return res.status(400).json({ success: false, message: 'numero_doc es obligatorio' });
    }
    if (!parsed.razonSocial) {
      return res.status(400).json({ success: false, message: 'razon_social es obligatoria' });
    }

    const duplicado = await clienteModel.findByDocumento(
      req.companyRuc,
      parsed.tipoDoc,
      parsed.numeroDoc,
    );
    if (duplicado) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con ese documento',
      });
    }

    const { addressInput, ...clienteData } = parsed;
    const row = await clienteModel.create({
      companyRuc: req.companyRuc,
      ...clienteData,
      addressInput,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create };
