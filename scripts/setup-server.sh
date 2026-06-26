#!/usr/bin/env bash
# Instalación inicial en servidor Ubuntu (producción)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Directorio: $ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: No existe .env. Copia .env.example o sube tu .env antes de continuar."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js no está instalado. Instala Node 18+ (ej. curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs)"
  exit 1
fi

echo "==> Node $(node -v) | npm $(npm -v)"

echo "==> Instalando dependencias (npm ci si hay package-lock, si no npm install)..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "==> Verificando conexión MySQL..."
node scripts/verify-mysql.js

echo "==> Creando base de datos si no existe..."
DB_NAME="$(grep -E '^DB_NAME=' .env | cut -d= -f2- | tr -d '\r' || true)"
DB_USER="$(grep -E '^DB_USER=' .env | cut -d= -f2- | tr -d '\r' || true)"
DB_PASSWORD="$(grep -E '^DB_PASSWORD=' .env | cut -d= -f2- | tr -d '\r' || true)"
if [[ -n "$DB_NAME" && -n "$DB_USER" ]]; then
  mysql -u "$DB_USER" ${DB_PASSWORD:+-p"$DB_PASSWORD"} -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || \
    echo "    (omitido: crea la BD manualmente si mysql CLI falla)"
fi

echo "==> Aplicando migraciones Prisma..."
node scripts/with-env.js migrate deploy

echo "==> Listo."
echo "    Iniciar app: npm start"
echo "    O con PM2:   pm2 start src/server.js --name backend-easy && pm2 save"
