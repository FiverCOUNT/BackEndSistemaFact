const express = require('express');
const homeController = require('../controllers/homeController');
const usuarioWebController = require('../controllers/usuarioWebController');
const companyWebController = require('../controllers/companyWebController');
const comprobanteWebController = require('../controllers/comprobanteWebController');
const clienteWebController = require('../controllers/clienteWebController');
const catalogItemWebController = require('../controllers/catalogItemWebController');
const almacenWebController = require('../controllers/almacenWebController');

const router = express.Router();

router.get('/', homeController.index);

router.get('/usuarios', usuarioWebController.list);
router.get('/usuarios/crear', usuarioWebController.showCreateForm);
router.post('/usuarios', usuarioWebController.create);
router.get('/usuarios/:id/editar', usuarioWebController.showEditForm);
router.post('/usuarios/:id', usuarioWebController.update);
router.post('/usuarios/:id/activar', usuarioWebController.activate);
router.post('/usuarios/:id/desactivar', usuarioWebController.deactivate);
router.post('/usuarios/:id/eliminar', usuarioWebController.destroy);

router.get('/companies', companyWebController.list);
router.get('/companies/crear', companyWebController.showCreateForm);
router.post('/companies', companyWebController.create);
router.get('/companies/:id/editar', companyWebController.showEditForm);
router.post('/companies/:id', companyWebController.update);
router.post('/companies/:id/activar', companyWebController.activate);
router.post('/companies/:id/desactivar', companyWebController.deactivate);
router.post('/companies/:id/eliminar', companyWebController.destroy);

router.get('/almacenes', almacenWebController.list);
router.get('/almacenes/crear', almacenWebController.showCreateForm);
router.post('/almacenes', almacenWebController.create);
router.get('/almacenes/:id/editar', almacenWebController.showEditForm);
router.post('/almacenes/:id', almacenWebController.update);
router.post('/almacenes/:id/activar', almacenWebController.activate);
router.post('/almacenes/:id/desactivar', almacenWebController.deactivate);
router.post('/almacenes/:id/eliminar', almacenWebController.destroy);

router.get('/catalogo', catalogItemWebController.list);
router.get('/catalogo/crear', catalogItemWebController.showCreateForm);
router.post('/catalogo', catalogItemWebController.create);
router.get('/catalogo/:id/editar', catalogItemWebController.showEditForm);
router.post('/catalogo/:id', catalogItemWebController.update);
router.post('/catalogo/:id/activar', catalogItemWebController.activate);
router.post('/catalogo/:id/desactivar', catalogItemWebController.deactivate);
router.post('/catalogo/:id/eliminar', catalogItemWebController.destroy);

router.get('/comprobantes', comprobanteWebController.list);
router.get('/clientes', clienteWebController.list);

module.exports = router;
