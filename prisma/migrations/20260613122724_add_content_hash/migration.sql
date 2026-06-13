/*
  Warnings:

  - A unique constraint covering the columns `[contentHash]` on the table `Resource` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contentHash` to the `Resource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "contentHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Resource_contentHash_key" ON "Resource"("contentHash");
