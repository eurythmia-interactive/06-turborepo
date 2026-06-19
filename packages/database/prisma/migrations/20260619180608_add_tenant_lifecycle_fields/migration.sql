-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "domain" TEXT,
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false;
