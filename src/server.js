require('./config/env');
const storageConfig = require('./config/storage');
const app = require('./app');
const config = require('./config');
const { initDatabase } = require('./models');

storageConfig.assertR2ProductionConfig();
storageConfig.warnR2PublicUrlMissing();







initDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Servidor en http://localhost:${config.port}`);
      console.log(`API REST: http://localhost:${config.port}/api`);
    });
  })
  .catch((err) => {
    console.error('Error al conectar la base de datos:', err);
    process.exit(1);
  });
