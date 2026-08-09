-- AlterEnum
ALTER TYPE "CancellationReason" RENAME TO "CancellationReason_old";
CREATE TYPE "CancellationReason" AS ENUM ('CANCELLED_BY_CLIENT', 'CANCELLED_BY_ADMIN');
ALTER TABLE "Booking" ALTER COLUMN "cancellationReason" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "cancellationReason" TYPE "CancellationReason" USING "cancellationReason"::"text"::"CancellationReason";
DROP TYPE "CancellationReason_old";
