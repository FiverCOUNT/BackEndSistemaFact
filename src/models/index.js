const sequelize = require('../config/database');
const Item = require('./Item');

async function initDatabase() {
  await sequelize.authenticate();
  await sequelize.sync();

  const count = await Item.count();
  if (count === 0) {
    await Item.bulkCreate([
      { name: 'Laptop', description: 'Equipo portátil', price: 899.99 },
      { name: 'Mouse', description: 'Mouse inalámbrico', price: 29.99 },
      { name: 'Teclado', description: 'Teclado mecánico', price: 79.99 },
    ]);
    console.log('Datos iniciales insertados en la tabla items');
  }

  console.log('MySQL conectado — tablas sincronizadas');
}

module.exports = {
  sequelize,
  Item,
  initDatabase,
};
