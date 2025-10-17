-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "emailVerificationExpires" TIMESTAMP(3),
ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Client_emailVerificationToken_idx" ON "Client"("emailVerificationToken");
