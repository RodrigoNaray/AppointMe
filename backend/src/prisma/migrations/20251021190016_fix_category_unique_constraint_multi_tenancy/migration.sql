/*
  Warnings:

  - A unique constraint covering the columns `[name,adminId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Category_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_adminId_key" ON "Category"("name", "adminId");
