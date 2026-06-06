const clienteModel = require('../models/clienteModel');
const { parseListQuery, buildPageMeta } = require('../utils/pagination');

function parseFlash(req) {
  const { msg, tipo } = req.query;
  if (!msg) return null;
  return { text: msg, type: tipo === 'error' ? 'error' : 'success' };
}

async function list(req, res, next) {
  try {
    const { q, page, pageSize, skip } = parseListQuery(req.query);
    const { total, items } = await clienteModel.findPaginated({
      q,
      page,
      pageSize,
      skip,
    });

    const pagination = buildPageMeta({
      total,
      page,
      pageSize,
      basePath: '/clientes',
      query: { q, msg: req.query.msg, tipo: req.query.tipo },
    });

    res.render('clientes/listar', {
      title: 'Clientes',
      clientes: items,
      total,
      q,
      pageSize,
      pagination,
      flash: parseFlash(req),
      searchAction: '/clientes',
      searchPlaceholder: 'Buscar por documento, razón social o RUC empresa…',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
