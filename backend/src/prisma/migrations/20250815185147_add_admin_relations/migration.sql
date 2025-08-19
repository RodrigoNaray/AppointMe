/*
  Warnings:

  - Added the required column `adminId` to the `AvailabilityBlock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `adminId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `adminId` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AvailabilityBlock" ADD COLUMN     "adminId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "adminId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "adminId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
