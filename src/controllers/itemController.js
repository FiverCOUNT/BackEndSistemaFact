const itemModel = require('../models/itemModel');

async function getAll(req, res, next) {
  try {
    const data = await itemModel.findAll();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const item = await itemModel.findById(id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, description, price } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'name y price son obligatorios',
      });
    }

    const item = await itemModel.create({ name, description, price });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    const item = await itemModel.update(id, req.body);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const deleted = await itemModel.remove(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    res.json({ success: true, message: 'Item eliminado' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
