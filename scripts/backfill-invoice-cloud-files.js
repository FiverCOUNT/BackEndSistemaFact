/**
 * Corrige URLs en BD (Cloudflare R2) y genera PDFs faltantes.
 * Requiere S3_PUBLIC_BASE_URL en .env.
 *
 * Uso: node scripts/backfill-invoice-cloud-files.js [--dry-run]
 */
require('dotenv').config();
require('../src/config/env');

const { PrismaClient } = require('@prisma/client');
const objectStorageService = require('../src/services/objectStorageService');
const comprobanteArchivosService = require('../src/services/comprobanteArchivosService');
const comprobantePdfService = require('../src/services/comprobantePdfService');
const comprobanteModel = require('../src/models/comprobanteModel');

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

function isServerProxyUrl(value) {
  return typeof value === 'string' && /\/api\/empresas\/[^/]+\/comprobantes\/[^/]+\/archivos\//i.test(value);
}

async function main() {
  if (!objectStorageService.isEnabled()) {
    console.error('R2 no está configurado.');
    process.exitCode = 1;
    return;
  }

  objectStorageService.assertPublicBaseUrlConfigured();
  console.log('URL pública R2:', objectStorageService.buildPublicUrl('comprobantes'));

  const rows = await prisma.invoice.findMany({
    where: { estado: { not: 'BORRADOR' } },
    select: { id: true, companyRuc: true, serie: true, correlativo: true },
  });

  let updated = 0;

  for (const row of rows) {
    const invoice = await comprobanteModel.findByIdForEmission(row.id, row.companyRuc);
    if (!invoice) continue;

    const estado = invoice.estado || 'ACEPTADO';

    let pdfUrl = invoice.pdfUrl;
    if (!pdfUrl || isServerProxyUrl(pdfUrl)) {
      if (dryRun) {
        pdfUrl = comprobanteArchivosService.resolveR2PublicUrl(invoice, 'pdf');
      } else {
        const buffer = await comprobantePdfService.generarPdfBuffer({ ...invoice, estado });
        const saved = await comprobanteArchivosService.persistGeneratedPdf(invoice, buffer, null);
        pdfUrl = saved?.url || null;
      }
    }

    const xmlUrl =
      comprobanteArchivosService.resolveR2PublicUrl(invoice, 'xml')
      || (isServerProxyUrl(invoice.xmlUrlDirecto) ? null : invoice.xmlUrlDirecto);

    const cdrUrl =
      comprobanteArchivosService.resolveR2PublicUrl(invoice, 'cdr')
      || (isServerProxyUrl(invoice.cdrZipUrl) ? null : invoice.cdrZipUrl);

    const data = {
      pdfUrl: pdfUrl || null,
      xmlUrlDirecto: xmlUrl || null,
      cdrZipUrl: cdrUrl || null,
      archivosJson: null,
    };

    const changed =
      data.pdfUrl !== invoice.pdfUrl
      || data.xmlUrlDirecto !== invoice.xmlUrlDirecto
      || data.cdrZipUrl !== invoice.cdrZipUrl
      || invoice.archivosJson != null;

    if (!changed) continue;

    if (dryRun) {
      console.log(`DRY ${row.serie}-${row.correlativo}:`, data);
    } else {
      await prisma.invoice.update({ where: { id: row.id }, data });
      console.log(`OK ${row.serie}-${row.correlativo}`);
    }
    updated += 1;
  }

  console.log(`\nActualizados: ${updated}${dryRun ? ' (dry-run)' : ''}`);
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
