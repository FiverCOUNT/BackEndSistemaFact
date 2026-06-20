/**
 * Hash CPE para QR SUNAT: DigestValue del XML firmado (base64) → hexadecimal.
 */
function extractHashFromXml(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') return null;

  const match = xmlString.match(/<(?:[\w-]+:)?DigestValue[^>]*>([^<]+)<\/(?:[\w-]+:)?DigestValue>/);
  if (!match?.[1]) return null;

  const digestValue = match[1].trim();
  if (!digestValue) return null;

  try {
    const decoded = Buffer.from(digestValue, 'base64');
    if (decoded.length === 0) return digestValue;
    return decoded.toString('hex');
  } catch {
    return digestValue;
  }
}

function extractHashFromBase64Xml(xmlBase64) {
  if (!xmlBase64 || typeof xmlBase64 !== 'string') return null;

  const cleaned = xmlBase64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!cleaned) return null;

  try {
    const xml = Buffer.from(cleaned, 'base64').toString('utf8');
    return extractHashFromXml(xml);
  } catch {
    return null;
  }
}

function resolveHashFromEmisorData(emisorData) {
  if (!emisorData || typeof emisorData !== 'object') return null;

  const direct = emisorData.hash_cpe || emisorData.hash;
  if (direct && typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  return extractHashFromBase64Xml(emisorData.xml);
}

module.exports = {
  extractHashFromXml,
  extractHashFromBase64Xml,
  resolveHashFromEmisorData,
};
