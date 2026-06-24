const express = require('express');
const authRoutes = require('./authRoutes');
const empresaRoutes = require('./empresaRoutes');
const configuracionApiController = require('../../controllers/configuracionApiController');

const router = express.Router();

router.get('/configuracion', configuracionApiController.getPublic);
router.use('/auth', authRoutes);
router.use('/empresas/:ruc', empresaRoutes);

module.exports = router;
