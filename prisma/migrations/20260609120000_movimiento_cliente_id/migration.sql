-- AlterTable
ALTER TABLE `movimientos` ADD COLUMN `cliente_id` VARCHAR(36) NULL;

-- CreateIndex
CREATE INDEX `movimientos_cliente_id_idx` ON `movimientos`(`cliente_id`);

-- AddForeignKey
ALTER TABLE `movimientos` ADD CONSTRAINT `movimientos_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- DropColumn
ALTER TABLE `movimientos` DROP COLUMN `cliente_snapshot`;
