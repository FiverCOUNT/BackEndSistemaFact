const prisma = require('../config/prisma');

async function initDatabase() {
  await prisma.$connect();
  console.log('MySQL conectado (Prisma) — tablas listas');
}

module.exports = {
  prisma,
  initDatabase,
};
