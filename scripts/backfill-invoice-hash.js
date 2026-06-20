/**
 * Rellena hash_cpe en invoices existentes a partir del XML guardado (sunatJson o almacenamiento).
 *
 * Uso: node scripts/backfill-invoice-hash.js [--dry-run]
 */
require('dotenv').config();
require('../src/config/env');

const { PrismaClient } = require('@prisma/client');
const comprobanteArchivosService = require('../src/services/comprobanteArchivosService');
const { extractHashFromXml } = require('../src/utils/xmlHash');

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function resolveHashForInvoice(invoice) {
  if (invoice.hash) return invoice.hash;

  const sunat = invoice.sunatJson && typeof invoice.sunatJson === 'object' ? invoice.sunatJson : null;
  const fromSunat = sunat?.hash_cpe || sunat?.hash;
  if (fromSunat) return fromSunat;

  const stored = await comprobanteArchivosService.getArchivoBuffer(invoice, 'xml');
  if (stored?.buffer) {
    const hash = extractHashFromXml(stored.buffer.toString('utf8'));
    if (hash) return hash;
  }

  return null;
}

async function main() {
  const rows = await prisma.invoice.findMany({
    where: {
      OR: [{ hash: null }, { hash: '' }],
      estado: { not: 'BORRADOR' },
    },
    select: {
      id: true,
      companyRuc: true,
      tipoDoc: true,
      serie: true,
      correlativo: true,
      hash: true,
      sunatJson: true,
      xmlUrlDirecto: true,
      cdrZipUrl: true,
      pdfUrl: true,
      archivosJson: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const invoice of rows) {
    const hash = await resolveHashForInvoice(invoice);
    if (!hash) {
      skipped += 1;
      console.log(`SKIP ${invoice.serie}-${invoice.correlativo} (${invoice.id}): sin XML/hash`);
      continue;
    }

    if (dryRun) {
      console.log(`DRY ${invoice.serie}-${invoice.correlativo}: ${hash.slice(0, 16)}…`);
      updated += 1;
      continue;
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { hash },
    });
    console.log(`OK ${invoice.serie}-${invoice.correlativo}: ${hash.slice(0, 16)}…`);
    updated += 1;
  }

  console.log(`\nTotal: ${rows.length} | actualizados: ${updated} | sin hash: ${skipped}${dryRun ? ' (dry-run)' : ''}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
