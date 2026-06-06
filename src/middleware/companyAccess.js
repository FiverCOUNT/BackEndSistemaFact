const prisma = require('../config/prisma');

async function requireCompanyRuc(req, res, next) {
  try {
    const ruc = (req.params.ruc || '').trim();
    if (!/^\d{11}$/.test(ruc)) {
      return res.status(400).json({ success: false, message: 'RUC inválido' });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: req.userId },
      include: { company: { select: { ruc: true } } },
    });

    const userRuc = user?.company?.ruc;
    if (!userRuc || userRuc !== ruc) {
      return res.status(403).json({
        success: false,
        message: 'Sin acceso a esta empresa',
      });
    }

    req.companyRuc = ruc;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireCompanyRuc };
