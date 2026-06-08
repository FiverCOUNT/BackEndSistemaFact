-- CreateTable
CREATE TABLE `companies` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ruc` VARCHAR(11) NOT NULL DEFAULT '',
    `nombre` VARCHAR(255) NOT NULL,
    `nombre_comercial` VARCHAR(255) NULL,
    `tipo_doc` VARCHAR(2) NULL,
    `numero_doc` VARCHAR(20) NULL,
    `address_id` VARCHAR(36) NULL,
    `email` VARCHAR(255) NULL,
    `telefono` VARCHAR(30) NULL,
    `telefonos` JSON NULL,
    `emails` JSON NULL,
    `cuentas_bancarias` JSON NULL,
    `billeteras_digitales` JSON NULL,
    `mensaje_agradecimiento` TEXT NULL,
    `mensaje_promocional` TEXT NULL,
    `sol_user` VARCHAR(100) NULL,
    `sol_pass` VARCHAR(255) NULL,
    `client_id` VARCHAR(255) NULL,
    `client_secret` VARCHAR(255) NULL,
    `ruta_firma` VARCHAR(500) NULL,
    `certificate_password` VARCHAR(255) NULL,
    `ruta_logo` VARCHAR(500) NULL,
    `name_logo` VARCHAR(255) NULL,
    `entorno` VARCHAR(20) NULL,
    `webhook_url` VARCHAR(500) NULL,
    `api_key` VARCHAR(255) NULL,
    `api_secret` VARCHAR(255) NULL,
    `plan` VARCHAR(50) NULL,
    `tax_regime` VARCHAR(50) NULL,
    `igv_rate_override` DECIMAL(6, 4) NULL,
    `nrus_categoria` INTEGER NULL,
    `max_documents_month` INTEGER NULL,
    `documents_this_month` INTEGER NULL,
    `ai_messages_this_month` INTEGER NULL,
    `usage_reset_month` VARCHAR(7) NULL,
    `user_id` BIGINT NULL,
    `sire_enabled` BOOLEAN NULL,
    `sire_last_period_synced` VARCHAR(10) NULL,
    `sire_last_reconciliation_at` VARCHAR(30) NULL,
    `sire_client_id` VARCHAR(255) NULL,
    `sire_client_secret` VARCHAR(255) NULL,
    `activo` BOOLEAN NULL,
    `is_active` BOOLEAN NULL,
    `tiene_certificado` BOOLEAN NULL,
    `tiene_webhook` BOOLEAN NULL,
    `creado_en` VARCHAR(30) NULL,

    UNIQUE INDEX `companies_address_id_key`(`address_id`),
    INDEX `companies_ruc_idx`(`ruc`),
    INDEX `companies_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `contrasena` VARCHAR(255) NOT NULL,
    `token` TEXT NULL,
    `refresh_token` TEXT NULL,
    `last_updated` BIGINT NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO', 'PENDIENTE', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
    `rol` ENUM('ADMIN', 'USUARIO') NOT NULL DEFAULT 'USUARIO',
    `company_id` BIGINT NULL,
    `almacen_id` VARCHAR(36) NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    INDEX `usuarios_almacen_id_idx`(`almacen_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_details` (
    `id` VARCHAR(36) NOT NULL,
    `invoice_id` VARCHAR(36) NULL,
    `catalog_item_id` VARCHAR(64) NULL,
    `descripcion` VARCHAR(500) NULL,
    `nombre` VARCHAR(255) NULL,
    `cantidad` DECIMAL(14, 4) NOT NULL,
    `unidad` VARCHAR(10) NULL DEFAULT 'NIU',
    `mto_precio_unitario` DECIMAL(14, 4) NULL,
    `tip_afe_igv` VARCHAR(4) NOT NULL DEFAULT '10',
    `mto_valor_venta` DECIMAL(14, 4) NULL,
    `mto_igv` DECIMAL(14, 4) NULL,
    `total` DECIMAL(14, 4) NULL,
    `mto_valor_unitario` DECIMAL(14, 4) NULL,
    `mto_base_igv` DECIMAL(14, 4) NULL,
    `porcentaje_igv` DECIMAL(6, 2) NULL,
    `producto_serie_id` VARCHAR(36) NULL,

    INDEX `sale_details_invoice_id_idx`(`invoice_id`),
    INDEX `sale_details_producto_serie_id_idx`(`producto_serie_id`),
    INDEX `sale_details_catalog_item_id_idx`(`catalog_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto_series` (
    `id` VARCHAR(36) NOT NULL,
    `company_ruc` VARCHAR(11) NOT NULL,
    `catalog_item_id` VARCHAR(64) NOT NULL,
    `numero_serie` VARCHAR(100) NOT NULL,
    `almacen_id` VARCHAR(36) NULL,
    `estado` ENUM('DISPONIBLE', 'RESERVADO', 'VENDIDO', 'ENTREGADO', 'BAJA') NOT NULL,
    `comprobante_id` VARCHAR(36) NULL,
    `entrega_id` VARCHAR(36) NULL,

    INDEX `producto_series_catalog_item_id_idx`(`catalog_item_id`),
    INDEX `producto_series_almacen_id_idx`(`almacen_id`),
    UNIQUE INDEX `producto_series_company_ruc_numero_serie_key`(`company_ruc`, `numero_serie`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos` (
    `id` VARCHAR(36) NOT NULL,
    `company_ruc` VARCHAR(11) NOT NULL,
    `almacen_id` VARCHAR(36) NOT NULL,
    `tipo` ENUM('ENTRADA', 'SALIDA', 'AJUSTE') NOT NULL,
    `fecha` VARCHAR(30) NOT NULL,
    `observaciones` TEXT NULL,
    `referencia_tipo` VARCHAR(50) NULL,
    `referencia_id` VARCHAR(36) NULL,
    `numero` VARCHAR(50) NULL,
    `almacen_destino_id` VARCHAR(36) NULL,
    `estado` ENUM('BORRADOR', 'DESPACHADA', 'ANULADA') NULL,
    `comprobante_id` VARCHAR(36) NULL,
    `guia_remision_id` VARCHAR(36) NULL,
    `fecha_despacho` VARCHAR(30) NULL,

    INDEX `movimientos_company_ruc_idx`(`company_ruc`),
    INDEX `movimientos_almacen_id_idx`(`almacen_id`),
    INDEX `movimientos_almacen_destino_id_idx`(`almacen_destino_id`),
    INDEX `movimientos_comprobante_id_idx`(`comprobante_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `linea_catalogo_items` (
    `linea_id` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NULL,
    `movimiento_id` VARCHAR(36) NOT NULL,
    `catalog_item_id` VARCHAR(64) NOT NULL,
    `nombre` VARCHAR(255) NULL,
    `codigo` VARCHAR(64) NULL,
    `descripcion` VARCHAR(500) NULL,
    `unidad` VARCHAR(10) NULL,
    `precio_unitario` DECIMAL(14, 4) NULL,
    `afectacion_igv` VARCHAR(4) NULL,
    `kind` VARCHAR(50) NULL,
    `maneja_stock` BOOLEAN NULL,
    `maneja_serie` BOOLEAN NULL,
    `cantidad` DECIMAL(14, 4) NOT NULL,
    `almacen_id` VARCHAR(36) NULL,
    `producto_serie_id` VARCHAR(36) NULL,
    `series` JSON NULL,
    `serie_ids` JSON NULL,
    `numeros_serie` JSON NULL,

    INDEX `linea_catalogo_items_movimiento_id_idx`(`movimiento_id`),
    INDEX `linea_catalogo_items_catalog_item_id_idx`(`catalog_item_id`),
    INDEX `linea_catalogo_items_producto_serie_id_idx`(`producto_serie_id`),
    INDEX `linea_catalogo_items_almacen_id_idx`(`almacen_id`),
    PRIMARY KEY (`linea_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog_items` (
    `id` VARCHAR(36) NOT NULL,
    `company_ruc` VARCHAR(11) NOT NULL,
    `kind` ENUM('PRODUCT', 'SERVICE') NOT NULL,
    `codigo` VARCHAR(64) NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `unidad` VARCHAR(10) NOT NULL,
    `precio_unitario` DECIMAL(14, 4) NOT NULL,
    `afectacion_igv` VARCHAR(4) NOT NULL DEFAULT '10',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `maneja_stock` BOOLEAN NOT NULL DEFAULT false,
    `maneja_serie` BOOLEAN NOT NULL DEFAULT false,
    `stock_actual` DECIMAL(14, 4) NULL,
    `duracion_minutos` INTEGER NULL,

    INDEX `catalog_items_company_ruc_idx`(`company_ruc`),
    INDEX `catalog_items_company_ruc_codigo_idx`(`company_ruc`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventario` (
    `id` VARCHAR(36) NOT NULL,
    `company_ruc` VARCHAR(11) NOT NULL,
    `catalog_item_id` VARCHAR(36) NOT NULL,
    `almacen_id` VARCHAR(36) NOT NULL,
    `producto_serie_id` VARCHAR(36) NULL,
    `saldo_key` VARCHAR(110) NULL,
    `cantidad` DECIMAL(14, 4) NOT NULL,

    UNIQUE INDEX `inventario_producto_serie_id_key`(`producto_serie_id`),
    UNIQUE INDEX `inventario_saldo_key_key`(`saldo_key`),
    INDEX `inventario_catalog_item_id_almacen_id_idx`(`catalog_item_id`, `almacen_id`),
    INDEX `inventario_company_ruc_idx`(`company_ruc`),
    INDEX `inventario_almacen_id_idx`(`almacen_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legends` (
    `id` VARCHAR(36) NOT NULL,
    `invoice_id` VARCHAR(36) NULL,
    `code` VARCHAR(10) NOT NULL,
    `value` TEXT NOT NULL,

    INDEX `legends_invoice_id_idx`(`invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes` (
    `id` VARCHAR(36) NOT NULL,
    `company_ruc` VARCHAR(11) NOT NULL,
    `tipo_doc` VARCHAR(2) NOT NULL,
    `numero_doc` VARCHAR(20) NOT NULL,
    `razon_social` VARCHAR(255) NOT NULL,
    `address_id` VARCHAR(36) NULL,
    `telefono` VARCHAR(30) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `clientes_address_id_key`(`address_id`),
    INDEX `clientes_company_ruc_idx`(`company_ruc`),
    UNIQUE INDEX `clientes_company_ruc_tipo_doc_numero_doc_key`(`company_ruc`, `tipo_doc`, `numero_doc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addresses` (
    `id` VARCHAR(36) NOT NULL,
    `ubigeo` VARCHAR(6) NULL,
    `departamento` VARCHAR(100) NULL,
    `provincia` VARCHAR(100) NULL,
    `distrito` VARCHAR(100) NULL,
    `urbanizacion` VARCHAR(100) NULL,
    `direccion` VARCHAR(500) NULL,
    `cod_local` VARCHAR(4) NULL DEFAULT '0000',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `almacenes` (
    `id` VARCHAR(36) NOT NULL,
    `company_ruc` VARCHAR(11) NOT NULL,
    `codigo` VARCHAR(32) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `address_id` VARCHAR(36) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `almacenes_address_id_key`(`address_id`),
    INDEX `almacenes_company_ruc_idx`(`company_ruc`),
    UNIQUE INDEX `almacenes_company_ruc_codigo_key`(`company_ruc`, `codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(36) NOT NULL,
    `company_ruc` VARCHAR(11) NOT NULL DEFAULT '',
    `ubl_version` VARCHAR(10) NOT NULL DEFAULT '2.1',
    `tipo_operacion` VARCHAR(10) NOT NULL DEFAULT '0101',
    `tipo_doc` VARCHAR(4) NOT NULL,
    `serie` VARCHAR(10) NOT NULL,
    `correlativo` VARCHAR(20) NOT NULL,
    `fecha_emision` VARCHAR(30) NULL,
    `fec_vencimiento` VARCHAR(30) NULL,
    `tipo_moneda` VARCHAR(3) NOT NULL DEFAULT 'PEN',
    `forma_pago` VARCHAR(50) NULL,
    `observacion` TEXT NULL,
    `mto_oper_gravadas` DECIMAL(14, 4) NULL,
    `mto_oper_exoneradas` DECIMAL(14, 4) NULL,
    `mto_oper_inafectas` DECIMAL(14, 4) NULL,
    `mto_oper_exportacion` DECIMAL(14, 4) NULL,
    `mto_igv` DECIMAL(14, 4) NULL,
    `total_impuestos` DECIMAL(14, 4) NULL,
    `sub_total` DECIMAL(14, 4) NULL,
    `mto_imp_venta` DECIMAL(14, 4) NULL,
    `totales` JSON NULL,
    `motivo_codigo` VARCHAR(10) NULL,
    `motivo_nota` VARCHAR(255) NULL,
    `documento_afectado_id` VARCHAR(36) NULL,
    `estado` ENUM('BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'ANULADO') NOT NULL DEFAULT 'BORRADOR',
    `cdr_estado` VARCHAR(50) NULL,
    `pdf_url` VARCHAR(500) NULL,
    `cdr_zip_url` VARCHAR(500) NULL,
    `xml_url` VARCHAR(500) NULL,
    `archivos` JSON NULL,
    `sunat_estado` VARCHAR(50) NULL,
    `sunat_codigo` VARCHAR(20) NULL,
    `sunat_descripcion` TEXT NULL,
    `sunat_notas` JSON NULL,
    `hash_cpe` VARCHAR(128) NULL,
    `sunat` JSON NULL,
    `enviar_automatico` BOOLEAN NULL,
    `cliente_id` VARCHAR(36) NULL,

    INDEX `invoices_company_ruc_idx`(`company_ruc`),
    INDEX `invoices_tipo_doc_idx`(`tipo_doc`),
    INDEX `invoices_documento_afectado_id_idx`(`documento_afectado_id`),
    INDEX `invoices_cliente_id_idx`(`cliente_id`),
    UNIQUE INDEX `invoices_company_ruc_tipo_doc_serie_correlativo_key`(`company_ruc`, `tipo_doc`, `serie`, `correlativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_address_id_fkey` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_almacen_id_fkey` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_details` ADD CONSTRAINT `sale_details_producto_serie_id_fkey` FOREIGN KEY (`producto_serie_id`) REFERENCES `producto_series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_details` ADD CONSTRAINT `sale_details_catalog_item_id_fkey` FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_details` ADD CONSTRAINT `sale_details_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_series` ADD CONSTRAINT `producto_series_catalog_item_id_fkey` FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_series` ADD CONSTRAINT `producto_series_comprobante_id_fkey` FOREIGN KEY (`comprobante_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_series` ADD CONSTRAINT `producto_series_almacen_id_fkey` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_comprobante_id_fkey` FOREIGN KEY (`comprobante_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_guia_remision_id_fkey` FOREIGN KEY (`guia_remision_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_almacen_id_fkey` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_almacen_destino_id_fkey` FOREIGN KEY (`almacen_destino_id`) REFERENCES `almacenes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `linea_catalogo_items` ADD CONSTRAINT `linea_catalogo_items_movimiento_id_fkey` FOREIGN KEY (`movimiento_id`) REFERENCES `movimientos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `linea_catalogo_items` ADD CONSTRAINT `linea_catalogo_items_producto_serie_id_fkey` FOREIGN KEY (`producto_serie_id`) REFERENCES `producto_series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `linea_catalogo_items` ADD CONSTRAINT `linea_catalogo_items_catalog_item_id_fkey` FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `linea_catalogo_items` ADD CONSTRAINT `linea_catalogo_items_almacen_id_fkey` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario` ADD CONSTRAINT `inventario_catalog_item_id_fkey` FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario` ADD CONSTRAINT `inventario_almacen_id_fkey` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario` ADD CONSTRAINT `inventario_producto_serie_id_fkey` FOREIGN KEY (`producto_serie_id`) REFERENCES `producto_series`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legends` ADD CONSTRAINT `legends_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_address_id_fkey` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `almacenes` ADD CONSTRAINT `almacenes_address_id_fkey` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_documento_afectado_id_fkey` FOREIGN KEY (`documento_afectado_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
