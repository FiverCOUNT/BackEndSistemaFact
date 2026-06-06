# Ejecutar en PowerShell COMO ADMINISTRADOR (clic derecho > Ejecutar como administrador)
$ErrorActionPreference = "Stop"

Write-Host "=== Setup MySQL/MariaDB para BackEndEasy ===" -ForegroundColor Cyan

$mariadb = "C:\Program Files\MariaDB 11.7\bin\mariadb.exe"
$sqlFile = Join-Path $PSScriptRoot "fix-auth.sql"

# 1. Detener MariaDB (servicio) para evitar conflicto con Laragon en el puerto 3306
$svc = Get-Service -Name "MariaDB" -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "Deteniendo servicio MariaDB..." -ForegroundColor Yellow
    Stop-Service MariaDB -Force
    Start-Sleep 2
}

# 2. Intentar aplicar SQL con cliente MariaDB (necesita que conozcas la clave de root)
$rootPass = $env:MARIA_ROOT_PASSWORD
if (-not $rootPass) {
    $secure = Read-Host "Clave actual de root en MariaDB (Enter si vacia)" -AsSecureString
    $rootPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}

$args = @("-u", "root", "-h", "127.0.0.1")
if ($rootPass) { $args += "-p$rootPass" }

Write-Host "Aplicando fix-auth.sql..." -ForegroundColor Yellow
& $mariadb @args -e "source $sqlFile"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "No se pudo conectar. Abre MySQL Workbench o HeidiSQL y ejecuta manualmente:" -ForegroundColor Red
    Write-Host "  $sqlFile" -ForegroundColor White
    Write-Host ""
    Write-Host "Luego en .env usa:" -ForegroundColor Yellow
    Write-Host "  DB_USER=backend" -ForegroundColor White
    Write-Host "  DB_PASSWORD=backend123" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Listo. Actualiza tu .env:" -ForegroundColor Green
Write-Host "  DB_USER=backend" -ForegroundColor White
Write-Host "  DB_PASSWORD=backend123" -ForegroundColor White
Write-Host ""
Write-Host "Luego en la carpeta del proyecto:" -ForegroundColor Green
Write-Host "  npm run db:push" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
