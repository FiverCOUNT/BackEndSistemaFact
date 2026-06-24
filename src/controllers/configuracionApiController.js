const configuracionModel = require('../models/configuracionModel');

async function getPublic(req, res, next) {
  try {
    const row = await configuracionModel.getSingleton();
    res.json({
      success: true,
      data: configuracionModel.toApiMobile(row),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublic };
