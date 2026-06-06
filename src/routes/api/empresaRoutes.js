const express = require('express');
const { requireAuth } = require('../../middleware/authMiddleware');
const { requireCompanyRuc } = require('../../middleware/companyAccess');
const { requireAdmin } = require('../../middleware/requireAdmin');
const catalogItemApiController = require('../../controllers/catalogItemApiController');
const inventarioApiController = require('../../controllers/inventarioApiController');
const almacenApiController = require('../../controllers/almacenApiController');

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireCompanyRuc);

router.get('/catalogo', catalogItemApiController.list);
router.post('/catalogo', requireAdmin, catalogItemApiController.create);
router.put('/catalogo/:id', requireAdmin, catalogItemApiController.update);
router.patch('/catalogo/:id', requireAdmin, catalogItemApiController.patch);
router.delete('/catalogo/:id', requireAdmin, catalogItemApiController.destroy);

router.get('/almacenes', almacenApiController.list);
router.post('/almacenes', requireAdmin, almacenApiController.create);

router.get('/inventario', inventarioApiController.list);
router.get('/inventario/:id', inventarioApiController.getById);
router.put('/inventario/saldos', requireAdmin, inventarioApiController.setSaldo);
router.patch('/inventario/saldos', requireAdmin, inventarioApiController.adjustSaldo);

module.exports = router;
