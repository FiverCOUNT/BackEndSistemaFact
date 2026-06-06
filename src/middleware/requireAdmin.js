function requireAdmin(req, res, next) {
  if (req.userRol !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Solo administradores pueden realizar esta acción',
    });
  }
  next();
}

module.exports = { requireAdmin };
