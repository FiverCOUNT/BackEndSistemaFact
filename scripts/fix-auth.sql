-- Ejecutar conectado como administrador de MariaDB (Workbench, HeidiSQL, etc.)
CREATE DATABASE IF NOT EXISTS db_api_system;

-- Usuario dedicado para la app (recomendado)
DROP USER IF EXISTS 'backend'@'localhost';
CREATE USER 'backend'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('backend123');
GRANT ALL PRIVILEGES ON db_api_system.* TO 'backend'@'localhost';

-- También arregla root local (opcional)
ALTER USER 'root'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('');
ALTER USER 'root'@'127.0.0.1' IDENTIFIED VIA mysql_native_password USING PASSWORD('');

FLUSH PRIVILEGES;
