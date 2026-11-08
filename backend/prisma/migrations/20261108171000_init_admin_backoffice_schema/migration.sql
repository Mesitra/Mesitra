-- AlterTable User
ALTER TABLE `User` ADD COLUMN `isSuspended` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `suspendedAt` DATETIME(3) NULL,
    ADD COLUMN `suspendedById` VARCHAR(191) NULL,
    ADD COLUMN `suspendedReason` TEXT NULL,
    ADD COLUMN `verifiedAt` DATETIME(3) NULL,
    ADD COLUMN `verifiedById` VARCHAR(191) NULL;

-- AlterTable Equipment
ALTER TABLE `Equipment` ADD COLUMN `isTakedownByAdmin` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `moderatedById` VARCHAR(191) NULL,
    ADD COLUMN `takedownAt` DATETIME(3) NULL,
    ADD COLUMN `takedownReason` TEXT NULL;

-- AlterTable Order
ALTER TABLE `Order` ADD COLUMN `netOwnerPayout` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `platformFee` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `platformFeeRate` DOUBLE NOT NULL DEFAULT 0.05;

-- AlterTable Review
ALTER TABLE `Review` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isFlagged` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `moderatedAt` DATETIME(3) NULL,
    ADD COLUMN `moderatedById` VARCHAR(191) NULL,
    ADD COLUMN `moderationNote` TEXT NULL;

-- CreateTable WithdrawalRequest
CREATE TABLE `WithdrawalRequest` (
    `id` VARCHAR(191) NOT NULL,
    `withdrawalCode` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `transferFee` INTEGER NOT NULL DEFAULT 0,
    `netAmount` INTEGER NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `accountHolder` VARCHAR(191) NOT NULL,
    `status` ENUM('MENUNGGU', 'DIPROSES', 'SELESAI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `bankReference` VARCHAR(191) NULL,
    `transferProofUrl` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `processedById` VARCHAR(191) NULL,
    `adminNotes` TEXT NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WithdrawalRequest_withdrawalCode_key`(`withdrawalCode`),
    INDEX `WithdrawalRequest_userId_idx`(`userId`),
    INDEX `WithdrawalRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable DisputeTicket
CREATE TABLE `DisputeTicket` (
    `id` VARCHAR(191) NOT NULL,
    `ticketNumber` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `renterId` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `claimAmount` INTEGER NOT NULL,
    `disputeReason` TEXT NOT NULL,
    `ownerPhotos` JSON NULL,
    `renterDefenseNote` TEXT NULL,
    `renterCounterPhotos` JSON NULL,
    `status` ENUM('OPEN', 'INVESTIGATING', 'RESOLVED_OWNER_WIN', 'RESOLVED_RENTER_WIN', 'RESOLVED_SPLIT', 'ESCALATED_LEGAL') NOT NULL DEFAULT 'OPEN',
    `finalDamageFee` INTEGER NULL,
    `refundToRenter` INTEGER NULL,
    `payoutToOwner` INTEGER NULL,
    `adminArbitrageNote` TEXT NULL,
    `arbitratedAt` DATETIME(3) NULL,
    `arbitratedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DisputeTicket_ticketNumber_key`(`ticketNumber`),
    UNIQUE INDEX `DisputeTicket_orderId_key`(`orderId`),
    INDEX `DisputeTicket_status_idx`(`status`),
    INDEX `DisputeTicket_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable AdminAuditLog
CREATE TABLE `AdminAuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminAuditLog_adminId_idx`(`adminId`),
    INDEX `AdminAuditLog_action_idx`(`action`),
    INDEX `AdminAuditLog_targetType_targetId_idx`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Equipment_isTakedownByAdmin_idx` ON `Equipment`(`isTakedownByAdmin`);

-- CreateIndex
CREATE INDEX `Review_isDeleted_idx` ON `Review`(`isDeleted`);

-- AddForeignKey
ALTER TABLE `WithdrawalRequest` ADD CONSTRAINT `WithdrawalRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeTicket` ADD CONSTRAINT `DisputeTicket_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeTicket` ADD CONSTRAINT `DisputeTicket_renterId_fkey` FOREIGN KEY (`renterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdminAuditLog` ADD CONSTRAINT `AdminAuditLog_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

