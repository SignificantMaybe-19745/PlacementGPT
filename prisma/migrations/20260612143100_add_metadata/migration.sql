-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "candidate" TEXT;

-- CreateIndex
CREATE INDEX "Resource_company_idx" ON "Resource"("company");
