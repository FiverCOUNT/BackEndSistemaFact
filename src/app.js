const path = require('path');
const express = require('express');
const cors = require('cors');
const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/api');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/', webRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;
