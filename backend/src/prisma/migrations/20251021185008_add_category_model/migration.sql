/*
  Warnings:

  - Added the required column `categoryId` to the `Service` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_adminId_idx" ON "Category"("adminId");

-- Insertar categoría por defecto "General" para cada admin que tenga servicios
INSERT INTO "Category" ("id", "name", "description", "adminId", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  'General',
  'Categoría general para servicios sin clasificar',
  "adminId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Service"
GROUP BY "adminId";

-- AlterTable: Agregar columna categoryId como nullable primero
ALTER TABLE "Service" ADD COLUMN "categoryId" TEXT;

-- Asignar la categoría "General" a todos los servicios existentes
UPDATE "Service" s
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."name" = 'General' AND c."adminId" = s."adminId";

-- Ahora hacer la columna NOT NULL
ALTER TABLE "Service" ALTER COLUMN "categoryId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_adminId_idx" ON "Service"("adminId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
