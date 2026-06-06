function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  if (status >= 500) {
    console.error(err);
  }

  if (req.path.startsWith('/api')) {
    return res.status(status).json({ success: false, message });
  }

  if (req.path.startsWith('/usuarios')) {
    const q = new URLSearchParams({ msg: message, tipo: 'error' });
    return res.redirect(`/usuarios?${q.toString()}`);
  }

  if (req.path.startsWith('/companies')) {
    const q = new URLSearchParams({ msg: message, tipo: 'error' });
    return res.redirect(`/companies?${q.toString()}`);
  }

  if (req.path.startsWith('/catalogo')) {
    const q = new URLSearchParams({ msg: message, tipo: 'error' });
    return res.redirect(`/catalogo?${q.toString()}`);
  }

  if (req.path.startsWith('/comprobantes')) {
    const q = new URLSearchParams({ msg: message, tipo: 'error' });
    return res.redirect(`/comprobantes?${q.toString()}`);
  }

  if (req.path.startsWith('/clientes')) {
    const q = new URLSearchParams({ msg: message, tipo: 'error' });
    return res.redirect(`/clientes?${q.toString()}`);
  }

  res.status(status).send(`<p style="font-family:sans-serif;padding:2rem;">${message}</p>`);
}

module.exports = errorHandler;
