-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- CreateIndex
CREATE INDEX "Client_passwordResetToken_idx" ON "Client"("passwordResetToken");
