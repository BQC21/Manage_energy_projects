/*
  Warnings:

  - You are about to drop the column `LCOE` on the `project` table. All the data in the column will be lost.
  - Added the required column `Return_time` to the `project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "project" DROP COLUMN "LCOE",
ADD COLUMN     "Return_time" INTEGER NOT NULL;
