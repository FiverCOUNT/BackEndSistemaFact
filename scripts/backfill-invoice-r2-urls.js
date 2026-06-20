/**
 * Reemplaza URLs del servidor (proxy API) por enlaces públicos de Cloudflare R2 en pdf_url / xml_url / cdr_zip_url.
 *
 * Requiere S3_PUBLIC_BASE_URL en .env.
 * Uso: node scripts/backfill-invoice-r2-urls.js [--dry-run]
 */
require('dotenv').config();
require('../src/config/env');

const { PrismaClient } = require('@prisma/client');
const objectStorageService = require('../src/services/objectStorageService');
const comprobanteArchivosService = require('../src/services/comprobanteArchivosService');

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

function needsR2Url(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (objectStorageService.isObjectKey(trimmed)) return true;
  if (/\/api\/empresas\/[^/]+\/comprobantes\/[^/]+\/archivos\//i.test(trimmed)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(trimmed)) return true;
  if (trimmed.includes('/storage/comprobantes/')) return true;
  return false;
}

async function main() {
  if (!objectStorageService.isEnabled()) {
    console.error('R2 no está configurado (S3_* en .env).');
    process.exitCode = 1;
    return;
  }

  objectStorageService.assertPublicBaseUrlConfigured();

  const rows = await prisma.invoice.findMany({
    where: { estado: { not: 'BORRADOR' } },
    select: {
      id: true,
      companyRuc: true,
      tipoDoc: true,
      serie: true,
      correlativo: true,
      clienteId: true,
      cliente: { select: { tipoDoc: true, numeroDoc: true } },
      pdfUrl: true,
      xmlUrlDirecto: true,
      cdrZipUrl: true,
      archivosJson: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const invoice of rows) {
    const pdfUrl = comprobanteArchivosService.normalizeStoredUrl(
      needsR2Url(invoice.pdfUrl) ? null : invoice.pdfUrl,
      invoice,
      'pdf',
      null,
    ) || (needsR2Url(invoice.pdfUrl) ? comprobanteArchivosService.resolveR2PublicUrl(invoice, 'pdf') : invoice.pdfUrl);

    const xmlUrl = comprobanteArchivosService.normalizeStoredUrl(
      needsR2Url(invoice.xmlUrlDirecto) ? null : invoice.xmlUrlDirecto,
      invoice,
      'xml',
      null,
    ) || (needsR2Url(invoice.xmlUrlDirecto)
      ? comprobanteArchivosService.resolveR2PublicUrl(invoice, 'xml')
      : invoice.xmlUrlDirecto);

    const cdrUrl = comprobanteArchivosService.normalizeStoredUrl(
      needsR2Url(invoice.cdrZipUrl) ? null : invoice.cdrZipUrl,
      invoice,
      'cdr',
      null,
    ) || (needsR2Url(invoice.cdrZipUrl)
      ? comprobanteArchivosService.resolveR2PublicUrl(invoice, 'cdr')
      : invoice.cdrZipUrl);

    const data = {
      pdfUrl: pdfUrl || invoice.pdfUrl,
      xmlUrlDirecto: xmlUrl || invoice.xmlUrlDirecto,
      cdrZipUrl: cdrUrl || invoice.cdrZipUrl,
      archivosJson: null,
    };

    const changed =
      data.pdfUrl !== invoice.pdfUrl
      || data.xmlUrlDirecto !== invoice.xmlUrlDirecto
      || data.cdrZipUrl !== invoice.cdrZipUrl
      || invoice.archivosJson != null;

    if (!changed) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`DRY ${invoice.serie}-${invoice.correlativo}:`, {
        pdf_url: data.pdfUrl,
        xml_url: data.xmlUrlDirecto,
        cdr_zip_url: data.cdrZipUrl,
      });
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
