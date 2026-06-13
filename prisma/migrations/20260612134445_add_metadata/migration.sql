/*
  Warnings:

  - You are about to drop the column `round` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Resource` table. All the data in the column will be lost.
  - Added the required column `sourceFile` to the `Resource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Resource" DROP COLUMN "round",
DROP COLUMN "source",
DROP COLUMN "sourceUrl",
DROP COLUMN "tags",
ADD COLUMN     "role" TEXT,
ADD COLUMN     "sourceFile" TEXT NOT NULL;
