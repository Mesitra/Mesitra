-- CreateTable: TenantProfile (1:1 dengan User)
-- joinYear tidak disimpan di sini; gunakan User.createdAt year saat membaca.
CREATE TABLE `TenantProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `storeName` VARCHAR(191) NULL,
    `storeDescription` TEXT NULL,
    `storeCategory` VARCHAR(191) NULL,
    `whatsappNumber` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `serviceRadius` INTEGER NULL,
    `operatingHours` JSON NULL,
    `ktpVerified` BOOLEAN NOT NULL DEFAULT false,
    `nibVerified` BOOLEAN NOT NULL DEFAULT false,
    `bankAccountVerified` BOOLEAN NOT NULL DEFAULT false,
    `npwpVerified` BOOLEAN NOT NULL DEFAULT false,
    `notifPesananBaru` BOOLEAN NOT NULL DEFAULT true,
    `notifPengembalianAlat` BOOLEAN NOT NULL DEFAULT true,
    `notifInspeksiDeposit` BOOLEAN NOT NULL DEFAULT false,
    `notifRingkasanMingguan` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TenantProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantProfile` ADD CONSTRAINT `TenantProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
