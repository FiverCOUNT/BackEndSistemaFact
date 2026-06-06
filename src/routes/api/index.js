const express = require('express');
const authRoutes = require('./authRoutes');
const empresaRoutes = require('./empresaRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/empresas/:ruc', empresaRoutes);

module.exports = router;
