function sanitizeClienteFolder(tipoDoc, numeroDoc) {
  const tipo = String(tipoDoc || '0').replace(/\D/g, '') || '0';
  const doc = String(numeroDoc || 'SIN-DOC')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 20);
  return `${tipo}-${doc || 'SINDOC'}`;
}

function resolveClienteFolderFromInvoice(invoice) {
  if (invoice?.cliente?.numeroDoc) {
    return sanitizeClienteFolder(invoice.cliente.tipoDoc, invoice.cliente.numeroDoc);
  }
  if (invoice?.clienteId) {
    return `id-${String(invoice.clienteId).slice(0, 36)}`;
  }
  return 'sin-cliente';
}

module.exports = {
  sanitizeClienteFolder,
  resolveClienteFolderFromInvoice,
};
