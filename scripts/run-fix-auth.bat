@echo off
chcp 65001 >nul
echo.
echo === Arreglar MariaDB para BackEndEasy ===
echo.
echo Se abrira el cliente MariaDB. Escribe la clave de root cuando la pida.
echo Si root no tiene clave, solo presiona Enter.
echo.
pause
"C:\Program Files\MariaDB 11.7\bin\mariadb.exe" -u root -p -h 127.0.0.1 < "%~dp0fix-auth.sql"
if %ERRORLEVEL% EQU 0 (
  echo.
  echo OK. Ahora ejecuta en la carpeta del proyecto:
  echo   npm run db:push
  echo   npm run dev
) else (
  echo.
  echo Fallo. Prueba Adminer con Laragon ^(ver SETUP-DB.md^).
)
echo.
pause
