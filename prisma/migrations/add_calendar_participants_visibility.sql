-- Add participants and visibility fields to calendar_events table
-- This enables collaborative scheduling with multi-user support

-- Add EventVisibility enum
CREATE TYPE "EventVisibility" AS ENUM ('private', 'team', 'all');

-- Add new columns to calendar_events
ALTER TABLE "calendar_events" 
  ADD COLUMN "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "visibility" "EventVisibility" DEFAULT 'team';

-- Create index for participants array for better query performance
CREATE INDEX "calendar_events_participants_idx" ON "calendar_events" USING GIN ("participants");

-- Add comment for documentation
COMMENT ON COLUMN "calendar_events"."participants" IS 'Array of user IDs who are invited to this event';
COMMENT ON COLUMN "calendar_events"."visibility" IS 'Event visibility: private (creator only), team (participants), all (everyone)';
