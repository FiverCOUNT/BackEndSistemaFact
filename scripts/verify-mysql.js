require('../src/config/env');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const { DB_HOST, DB_USER, DB_NAME, DB_PORT } = process.env;
  await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log('OK — MySQL conectado');
  console.log(`Host: ${DB_HOST}:${DB_PORT || 3306}`);
  console.log(`Usuario: ${DB_USER}`);
  console.log(`Base de datos: ${DB_NAME}`);
}

main()
  .catch((err) => {
    console.error('ERROR — no se pudo conectar a MySQL');
    console.error(err.message.split('\n')[0]);
    console.log('\nRevisa en .env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
