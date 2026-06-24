-- Configuración global de la app móvil (singleton id = 1)
CREATE TABLE `configuracion` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `nombre_app` VARCHAR(120) NOT NULL DEFAULT 'FactApp',
    `nombre_desarrollador` VARCHAR(255) NOT NULL DEFAULT '',
    `telefonos_soporte` JSON NULL,
    `whatsapp_soporte` VARCHAR(20) NULL,
    `email_soporte` VARCHAR(255) NULL,
    `horario_soporte` VARCHAR(120) NULL,
    `url_actualizacion` VARCHAR(500) NULL,
    `url_actualizacion_apk` VARCHAR(500) NULL,
    `version_actual` VARCHAR(20) NULL,
    `version_minima` VARCHAR(20) NULL,
    `notas_release` TEXT NULL,
    `mantenimiento_activo` BOOLEAN NOT NULL DEFAULT false,
    `mensaje_mantenimiento` TEXT NULL,
    `url_terminos` VARCHAR(500) NULL,
    `url_privacidad` VARCHAR(500) NULL,
    `url_sitio_web` VARCHAR(500) NULL,
    `url_logo` VARCHAR(500) NULL,
    `mensaje_bienvenida` TEXT NULL,
    `redes_sociales` JSON NULL,
    `actualizado_en` VARCHAR(30) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `configuracion` (
    `id`,
    `nombre_app`,
    `nombre_desarrollador`,
    `telefonos_soporte`,
    `whatsapp_soporte`,
    `email_soporte`,
    `horario_soporte`,
    `url_actualizacion`,
    `version_actual`,
    `version_minima`,
    `mensaje_bienvenida`,
    `actualizado_en`
) VALUES (
    1,
    'FactApp',
    'FiverCOUNT',
    JSON_ARRAY('999 999 999'),
    NULL,
    'soporte@ejemplo.com',
    'Lun - Vie 9:00 a 18:00',
    NULL,
    '1.0.0',
    '1.0.0',
    'Bienvenido a FactApp',
    DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')
);
