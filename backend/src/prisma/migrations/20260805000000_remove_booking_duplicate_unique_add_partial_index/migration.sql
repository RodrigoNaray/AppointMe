-- Remove the full-tuple unique constraint that prevented re-booking a slot after cancellation
-- (soft delete keeps the CANCELLED row, and the unique did not include status).
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_bookingTime_serviceId_clientId_adminId_key";

-- Defense in depth against double-booking the exact same slot by two different clients:
-- a partial unique index that only applies to CONFIRMED bookings.
CREATE UNIQUE INDEX "Booking_bookingTime_adminId_status_key" ON "Booking"("bookingTime", "adminId") WHERE "status" = 'CONFIRMED';
