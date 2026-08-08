-- DropIndex
DROP INDEX "Booking_bookingTime_serviceId_clientId_adminId_key";

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "businessDescription" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "clientTimezone" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
