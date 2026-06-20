/**
 * Migra rutas del JSON `archivos` a pdf_url / xml_url / cdr_zip_url y limpia `archivos`.
 *
 * Uso: node scripts/migrate-archivos-to-columns.js [--dry-run]
 */
require('dotenv').config();
require('../src/config/env');

const { PrismaClient } = require('@prisma/client');
const comprobanteArchivosService = require('../src/services/comprobanteArchivosService');

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const objectStorageService = require('../src/services/objectStorageService');
const apiBaseUrl = objectStorageService.isEnabled()
  ? null
  : (process.env.API_PUBLIC_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

async function main() {
  const rows = await prisma.invoice.findMany({
    where: {
      OR: [
        { archivosJson: { not: null } },
        { pdfUrl: null, xmlUrlDirecto: null, cdrZipUrl: null, estado: { not: 'BORRADOR' } },
      ],
    },
    select: {
      id: true,
      companyRuc: true,
      serie: true,
      correlativo: true,
      pdfUrl: true,
      xmlUrlDirecto: true,
      cdrZipUrl: true,
      archivosJson: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const invoice of rows) {
    const columns = comprobanteArchivosService.resolveColumnUrlsFromLegacy(invoice, apiBaseUrl);
    const hasLegacy = invoice.archivosJson != null;
    const needsUpdate =
      hasLegacy
      || (columns.pdfUrl && columns.pdfUrl !== invoice.pdfUrl)
      || (columns.xmlUrlDirecto && columns.xmlUrlDirecto !== invoice.xmlUrlDirecto)
      || (columns.cdrZipUrl && columns.cdrZipUrl !== invoice.cdrZipUrl);

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    const data = {
      pdfUrl: columns.pdfUrl || invoice.pdfUrl,
      xmlUrlDirecto: columns.xmlUrlDirecto || invoice.xmlUrlDirecto,
      cdrZipUrl: columns.cdrZipUrl || invoice.cdrZipUrl,
      archivosJson: null,
    };

    if (dryRun) {
      console.log(`DRY ${invoice.serie}-${invoice.correlativo}:`, data);
      updated += 1;
      continue;
    }

    await prisma.invoice.update({ where: { id: invoice.id }, data });
    console.log(`OK ${invoice.serie}-${invoice.correlativo}`);
    updated += 1;
  }

  console.log(`\nTotal: ${rows.length} | actualizados: ${updated} | sin cambios: ${skipped}${dryRun ? ' (dry-run)' : ''}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
