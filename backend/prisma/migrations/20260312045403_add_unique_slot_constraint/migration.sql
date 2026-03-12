/*
  Warnings:

  - A unique constraint covering the columns `[date,startTime,endTime]` on the table `slots` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "slots_date_startTime_endTime_key" ON "slots"("date", "startTime", "endTime");
