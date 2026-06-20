const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path: '/api' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function inv(ruc, tok, alm, product) {
  const res = await req(
    'GET',
    `/empresas/${ruc}/inventario?almacen_id=${alm}&catalog_item_id=${product}`,
    null,
    tok,
  );
  return JSON.parse(res.body);
}

async function main() {
  const login = await req('POST', '/auth/login', { email: '2@gmail.com', password: '123456' });
  const tok = JSON.parse(login.body).data.accessToken;
  const ruc = '22222222222';
  const product = '42b2c788-952d-4578-ad94-c591d0bce4fe';
  const origen = '3d14a79d-605e-43a8-90fd-85493603206d';
  const destino = 'f4d0cb14-285e-440f-bfe3-299ff6db191e';

  console.log('BEFORE origen', await inv(ruc, tok, origen, product));
  console.log('BEFORE destino', await inv(ruc, tok, destino, product));

  const res = await req(
    'POST',
    `/empresas/${ruc}/entregas`,
    {
      almacen_id: origen,
      almacen_destino_id: destino,
      lineas: [{ catalog_item_id: product, cantidad: 10 }],
    },
    tok,
  );
  console.log('STATUS', res.status, res.status !== 201 ? res.body : 'OK');

  console.log('AFTER origen', await inv(ruc, tok, origen, product));
  console.log('AFTER destino', await inv(ruc, tok, destino, product));
}

main().catch(console.error);
