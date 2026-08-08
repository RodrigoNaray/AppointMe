-- Remove the full-tuple unique constraint that prevented re-booking a slot after cancellation
-- (soft delete keeps the CANCELLED row, and the unique did not include status).
-- The constraint was created outside the migration history on some environments, so the
-- DROP is conditional to keep fresh databases and existing ones in sync.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Booking_bookingTime_serviceId_clientId_adminId_key'
      AND conrelid = '"Booking"'::regclass
  ) THEN
    ALTER TABLE "Booking" DROP CONSTRAINT "Booking_bookingTime_serviceId_clientId_adminId_key";
  END IF;
END $$;

-- Defense in depth against double-booking the exact same slot by two different clients:
-- a partial unique index that only applies to CONFIRMED bookings.
CREATE UNIQUE INDEX "Booking_bookingTime_adminId_status_key" ON "Booking"("bookingTime", "adminId") WHERE "status" = 'CONFIRMED';
