require('../src/config/env');
const storage = require('../src/config/storage');
const objectStorageService = require('../src/services/objectStorageService');

async function main() {
  console.log('R2 enabled:', storage.r2.enabled);
  console.log('Bucket:', storage.r2.bucket);
  console.log('Endpoint:', storage.r2.endpoint);
  console.log('Public URL:', storage.r2.publicBaseUrl || '(no configurado)');

  try {
    const result = await objectStorageService.uploadCertificado(
      '20100000001',
      Buffer.from('r2-test'),
      'test-upload.pfx',
    );
    console.log('Upload OK:', result);

    const buf = await objectStorageService.getObjectBuffer(result.key);
    console.log('Read back:', buf ? buf.toString() : null);

    const publicUrl = objectStorageService.buildPublicUrl(result.key);
    if (publicUrl) {
      const res = await fetch(publicUrl);
      console.log('Public fetch:', res.status, res.statusText);
    }
  } catch (err) {
    console.error('Upload FAIL:', err.name, err.message);
    if (err.Code) console.error('Code:', err.Code);
    if (err.$metadata) console.error('Metadata:', err.$metadata);
    process.exit(1);
  }
}

main();
