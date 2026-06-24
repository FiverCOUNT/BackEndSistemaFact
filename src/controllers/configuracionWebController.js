const configuracionModel = require('../models/configuracionModel');

function parseFlash(req) {
  const { msg, tipo } = req.query;
  if (!msg) return null;
  return { text: msg, type: tipo === 'error' ? 'error' : 'success' };
}

function redirectEdit(res, message, type = 'success') {
  const q = new URLSearchParams({ msg: message, tipo: type });
  return res.redirect(`/configuracion?${q.toString()}`);
}

async function showEditForm(req, res, next) {
  try {
    const row = await configuracionModel.getSingleton();
    res.render('configuracion/editar', {
      title: 'Configuración de la app',
      form: configuracionModel.formFromRecord(row),
      flash: parseFlash(req),
      actualizadoEn: row.actualizadoEn,
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    await configuracionModel.updateFromBody(req.body);
    return redirectEdit(res, 'Configuración de la app guardada correctamente.');
  } catch (err) {
    if (err.message && !err.code) {
      const row = await configuracionModel.getSingleton().catch(() => null);
      const fallback = configuracionModel.formFromRecord(row);
      return res.status(400).render('configuracion/editar', {
        title: 'Configuración de la app',
        form: {
          ...fallback,
          ...req.body,
          mantenimientoActivo: req.body.mantenimientoActivo === 'on',
        },
        error: err.message,
        actualizadoEn: row?.actualizadoEn,
      });
    }
    return next(err);
  }
}

module.exports = {
  showEditForm,
  update,
};
