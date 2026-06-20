ALTER TABLE "Client" ADD COLUMN "emailLanguage" TEXT NOT NULL DEFAULT 'es';

CREATE INDEX "Service_adminId_isActive_idx" ON "Service"("adminId", "isActive");

CREATE INDEX "Booking_clientId_bookingTime_idx" ON "Booking"("clientId", "bookingTime");

CREATE INDEX "AvailabilityBlock_adminId_startTime_idx" ON "AvailabilityBlock"("adminId", "startTime");
