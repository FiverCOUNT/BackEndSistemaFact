const inventarioModel = require('../models/inventarioModel');
const movimientoModel = require('../models/movimientoModel');
const { resolveCatalogQuery } = require('../utils/catalogAccess');
const {
  normalizeAlmacenId,
  resolveAlmacenFromBody,
  resolveAlmacenFromQuery,
} = require('../utils/almacenAccess');

async function list(req, res, next) {
  try {
    const { almacenId } = resolveCatalogQuery(req);
    const catalogItemId = (req.query.catalog_item_id || '').trim() || null;
    const soloConStock = req.query.solo_con_stock !== 'false';

    const items = await inventarioModel.findMany({
      companyRuc: req.companyRuc,
      almacenId,
      catalogItemId,
      soloConStock,
    });

    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await inventarioModel.findById(req.params.id, req.companyRuc);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Registro de inventario no encontrado' });
    }

    if (req.userRol !== 'ADMIN' && row.almacen_id !== normalizeAlmacenId(req.userAlmacenId)) {
      return res.status(403).json({ success: false, message: 'No puede consultar otro almacén' });
    }

    res.json(row);
  } catch (err) {
    next(err);
  }
}

async function setSaldo(req, res, next) {
  try {
    const catalogItemId = (req.body.catalog_item_id || req.body.catalogItemId || '').trim();
    const almacenId = resolveAlmacenFromBody(req, { required: true, defaultToUser: false });
    const cantidad = req.body.cantidad ?? req.body.cantidad_nueva;

    if (!catalogItemId) {
      return res.status(400).json({
        success: false,
        message: 'catalog_item_id es obligatorio',
      });
    }

    if (cantidad === undefined || cantidad === null) {
      return res.status(400).json({ success: false, message: 'cantidad es obligatoria' });
    }

    const result = await inventarioModel.establecerSaldo({
      companyRuc: req.companyRuc,
      catalogItemId,
      almacenId,
      cantidad,
    });

    if (result.error === 'item_not_found') {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    if (result.error === 'almacen_not_found') {
      return res.status(404).json({ success: false, message: 'Almacén no encontrado' });
    }
    if (result.error === 'use_series') {
      return res.status(400).json({
        success: false,
        message: 'Este producto maneja serie; use producto_series e inventario por unidad',
      });
    }
    if (result.error === 'cantidad_invalida') {
      return res.status(400).json({ success: false, message: 'La cantidad no puede ser negativa' });
    }

    res.json({
      success: true,
      cantidad_anterior: result.cantidad_anterior,
      cantidad_nueva: result.cantidad_nueva,
      data: result.row,
    });
  } catch (err) {
    next(err);
  }
}

async function adjustSaldo(req, res, next) {
  try {
    const catalogItemId = (req.body.catalog_item_id || req.body.catalogItemId || '').trim();
    const almacenId = resolveAlmacenFromBody(req, { required: true, defaultToUser: false });
    const delta = req.body.delta ?? req.body.cantidad_delta;

    if (!catalogItemId) {
      return res.status(400).json({
        success: false,
        message: 'catalog_item_id es obligatorio',
      });
    }

    if (delta === undefined || delta === null || Number(delta) === 0) {
      return res.status(400).json({ success: false, message: 'delta es obligatorio y distinto de 0' });
    }

    const result = await inventarioModel.ajustarSaldo({
      companyRuc: req.companyRuc,
      catalogItemId,
      almacenId,
      delta,
    });

    if (result.error === 'item_not_found') {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    if (result.error === 'almacen_not_found') {
      return res.status(404).json({ success: false, message: 'Almacén no encontrado' });
    }
    if (result.error === 'use_series') {
      return res.status(400).json({
        success: false,
        message: 'Este producto maneja serie; use producto_series e inventario por unidad',
      });
    }
    if (result.error === 'stock_insuficiente') {
      return res.status(409).json({
        success: false,
        message: 'Stock insuficiente',
        cantidad_actual: result.cantidad_actual,
      });
    }

    res.json({
      success: true,
      cantidad_anterior: result.cantidad_anterior,
      cantidad_nueva: result.cantidad_nueva,
      data: result.row,
    });
  } catch (err) {
    next(err);
  }
}

async function listMovimientos(req, res, next) {
  try {
    const tipo = (req.query.tipo || '').trim().toUpperCase() || null;

    if (req.userRol !== 'ADMIN' && !req.userAlmacenId) {
      return res.json([]);
    }

    const almacenId = resolveAlmacenFromQuery(req, { required: false });

    const items = await movimientoModel.findMany({
      companyRuc: req.companyRuc,
      tipo,
      almacenId,
    });

    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function registrarEntrada(req, res, next) {
  try {
    const almacenId = resolveAlmacenFromBody(req, { required: true, defaultToUser: true });
    const lineas = req.body.lineas || [];
    const observaciones = req.body.observaciones ?? null;

    const result = await movimientoModel.registrarEntrada({
      companyRuc: req.companyRuc,
      almacenId,
      lineas,
      observaciones,
    });

    if (result.error === 'almacen_not_found') {
      return res.status(404).json({ success: false, message: 'Almacén no encontrado' });
    }
    if (result.error === 'lineas_vacias') {
      return res.status(400).json({ success: false, message: 'Debe incluir al menos una línea' });
    }
    if (result.error === 'item_not_found') {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    if (result.error === 'item_inactivo') {
      return res.status(400).json({ success: false, message: 'Producto inactivo' });
    }
    if (result.error === 'series_requeridas') {
      return res.status(400).json({
        success: false,
        message: 'Producto serializado: indique los números de serie',
      });
    }
    if (result.error === 'cantidad_series') {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe coincidir con el número de series',
      });
    }
    if (result.error === 'cantidad_invalida') {
      return res.status(400).json({ success: false, message: 'Cantidad inválida' });
    }
    if (result.error === 'serie_duplicada_linea') {
      return res.status(400).json({
        success: false,
        message: `Serie duplicada en la misma línea: ${result.numeroSerie}`,
      });
    }
    if (result.error === 'serie_existente') {
      return res.status(409).json({
        success: false,
        message: result.numeroSerie
          ? `La serie ${result.numeroSerie} ya está registrada`
          : 'Uno de los números de serie ya está registrado',
      });
    }

    res.status(201).json(result.movimiento);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, setSaldo, adjustSaldo, listMovimientos, registrarEntrada };
