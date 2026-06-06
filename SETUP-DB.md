# Arreglar conexión MySQL (auth_gssapi_client)

Tu PC tiene **MariaDB 11** (servicio). **MySQL Workbench suele crashear** con MariaDB + `auth_gssapi_client` — no lo uses para esto.

Prisma necesita el plugin `mysql_native_password`.

## Opción A — Doble clic (consola MariaDB)

1. Ve a la carpeta `scripts` del proyecto.
2. Doble clic en **`run-fix-auth.bat`**.
3. Cuando pida contraseña, escribe la de `root` de MariaDB (o Enter si está vacía).
4. En `.env` ya está configurado:
   ```
   DB_USER=backend
   DB_PASSWORD=backend123
   ```
5. En la terminal del proyecto:
   ```powershell
   cd C:\Users\jhonny\Desktop\BackEndEasy
   npm run db:push
   npm run dev
   ```

## Opción B — Adminer (Laragon)

1. Abre **Laragon** → clic derecho → **Admin** o **Database** → **Adminer**.
2. O en el navegador: http://localhost/adminer (si Laragon está encendido).
3. Servidor: `127.0.0.1`, Usuario: `root`, Contraseña: (la que uses en MariaDB).
4. Pestaña **Comando SQL** → pega el contenido de `scripts/fix-auth.sql` → Ejecutar.

> Si Adminer no conecta, usa la Opción A (es el cliente nativo de MariaDB).

## Opción C — PowerShell como administrador

1. Clic derecho en PowerShell → **Ejecutar como administrador**.
2. ```powershell
   cd C:\Users\jhonny\Desktop\BackEndEasy
   npm run db:setup
   ```
3. Te pedirá la contraseña actual de `root` en MariaDB.
4. Luego: `npm run db:push` y `npm run dev`.

## Si sigue fallando

- En **Servicios de Windows**, detén **MariaDB** si solo quieres usar Laragon, o al revés (solo uno en el puerto 3306).
- Verifica que exista la base `db_api_system`.
