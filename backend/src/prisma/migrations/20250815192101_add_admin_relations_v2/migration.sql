/*
  Warnings:

  - A unique constraint covering the columns `[startTime,endTime,adminId]` on the table `AvailabilityBlock` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bookingTime,serviceId,clientId,adminId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Service` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `AvailabilityBlock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AvailabilityBlock" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilityBlock_startTime_endTime_adminId_key" ON "AvailabilityBlock"("startTime", "endTime", "adminId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingTime_serviceId_clientId_adminId_key" ON "Booking"("bookingTime", "serviceId", "clientId", "adminId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");
