/*
  Warnings:

  - Added the required column `durationMinutes` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/

-- Paso 1: Agregar columna con valor temporal por defecto
ALTER TABLE "Booking" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 60;

-- Paso 2: Actualizar registros existentes con la duración real del servicio
UPDATE "Booking" 
SET "durationMinutes" = "Service"."durationMinutes"
FROM "Service"
WHERE "Booking"."serviceId" = "Service"."id";

-- Paso 3: Remover el default (ahora es requerido sin default)
ALTER TABLE "Booking" ALTER COLUMN "durationMinutes" DROP DEFAULT;

