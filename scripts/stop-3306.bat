@echo off
:: Clic derecho > Ejecutar como administrador
echo Deteniendo MariaDB y procesos en puerto 3306...
net stop MariaDB 2>nul
sc stop MariaDB 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3306" ^| findstr LISTENING') do taskkill /PID %%a /F 2>nul
timeout /t 2 >nul
netstat -ano | findstr ":3306"
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Puerto 3306 libre.
) else (
  echo.
  echo Aun hay algo en 3306. Abre services.msc y detiene "MariaDB" manualmente.
)
pause
