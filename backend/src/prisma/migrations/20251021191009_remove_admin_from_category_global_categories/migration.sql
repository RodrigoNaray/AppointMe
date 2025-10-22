/*
  Warnings:

  - You are about to drop the column `adminId` on the `Category` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_adminId_fkey";

-- DropIndex
DROP INDEX "Category_adminId_idx";

-- DropIndex
DROP INDEX "Category_name_adminId_key";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "adminId";

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
