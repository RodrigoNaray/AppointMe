-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "emailChangeExpires" TIMESTAMP(3),
ADD COLUMN     "emailChangeToken" TEXT,
ADD COLUMN     "pendingEmail" TEXT;

-- CreateIndex
CREATE INDEX "Client_emailChangeToken_idx" ON "Client"("emailChangeToken");
