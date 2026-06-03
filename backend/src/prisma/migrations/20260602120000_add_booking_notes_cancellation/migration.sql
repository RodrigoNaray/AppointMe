-- AlterEnum
CREATE TYPE "CancellationReason" AS ENUM ('CANCELLED_BY_CLIENT', 'CANCELLED_BY_ADMIN', 'CANCELLED_BY_ADMIN_RESCHEDULE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" "CancellationReason",
ADD COLUMN     "notes" TEXT;

-- DropColumn
ALTER TABLE "Booking" DROP COLUMN "reminderSent";

-- CreateIndex
CREATE INDEX "Booking_adminId_status_idx" ON "Booking"("adminId", "status");
