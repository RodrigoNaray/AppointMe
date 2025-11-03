-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- AlterTable AdminUser: Agregar minCancellationNoticeMinutes
ALTER TABLE "AdminUser" ADD COLUMN "minCancellationNoticeMinutes" INTEGER DEFAULT 120;

-- AlterTable Booking: PASO 1 - Agregar columnas con DEFAULT
ALTER TABLE "Booking" ADD COLUMN "reminderSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "status" "BookingStatus" DEFAULT 'CONFIRMED';

-- AlterTable Booking: PASO 2 - Actualizar registros existentes
UPDATE "Booking" SET "status" = 'CONFIRMED' WHERE "status" IS NULL;

-- AlterTable Booking: PASO 3 - Hacer NOT NULL con DEFAULT
ALTER TABLE "Booking" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
