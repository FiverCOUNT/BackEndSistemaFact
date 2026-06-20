require('dotenv').config();
require('../src/config/env');
const { PrismaClient } = require('@prisma/client');
const storage = require('../src/config/storage');

const prisma = new PrismaClient();

async function main() {
  console.log('R2 enabled:', storage.r2.enabled);
  console.log('S3_PUBLIC_BASE_URL:', storage.r2.publicBaseUrl || '(no configurado)');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  const rows = await prisma.invoice.findMany({
    where: { estado: { not: 'BORRADOR' } },
    select: {
      serie: true,
      correlativo: true,
      pdfUrl: true,
      xmlUrlDirecto: true,
      cdrZipUrl: true,
      estado: true,
    },
    take: 10,
    orderBy: { fechaEmision: 'desc' },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main().finally(() => prisma.$disconnect());
