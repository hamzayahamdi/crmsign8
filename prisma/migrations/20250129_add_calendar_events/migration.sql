-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('rendez_vous', 'suivi_projet', 'appel_reunion', 'urgent');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('min_15', 'hour_1', 'day_1', 'none');

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "eventType" "EventType" NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "location" TEXT,
    "reminderType" "ReminderType" NOT NULL DEFAULT 'none',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "linkedClientId" TEXT,
    "linkedLeadId" TEXT,
    "linkedArchitectId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_events_startDate_idx" ON "calendar_events"("startDate" DESC);

-- CreateIndex
CREATE INDEX "calendar_events_assignedTo_idx" ON "calendar_events"("assignedTo");

-- CreateIndex
CREATE INDEX "calendar_events_eventType_idx" ON "calendar_events"("eventType");

-- CreateIndex
CREATE INDEX "calendar_events_createdBy_idx" ON "calendar_events"("createdBy");
