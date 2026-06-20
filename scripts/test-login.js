require('../src/config/env');
const bcrypt = require('bcryptjs');
const authService = require('../src/services/authService');
const prisma = require('../src/config/prisma');

async function main() {
  const email = process.argv[2] || '2@gmail.com';
  const password = process.argv[3] || '1234';

  const user = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: {
      company: { select: { ruc: true, nombre: true } },
      almacen: { select: { id: true, nombre: true, codigo: true } },
    },
  });

  if (!user) {
    console.log('Usuario no encontrado:', email);
    return;
  }

  console.log('Usuario:', user.email, user.estado, user.rol);
  console.log('Company:', user.company?.ruc, user.company?.nombre);
  console.log('Almacen:', user.almacenId, user.almacen?.nombre);

  const ok = await bcrypt.compare(password, user.contrasena);
  console.log('Password match', password, ':', ok);

  if (ok) {
    const session = await authService.login({ email, contrasena: password });
    console.log('Login OK:', JSON.stringify(session, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
