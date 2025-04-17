-- Add created_at column to dungeon_runs table
ALTER TABLE "dungeon_runs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to set created_at the same as start_time if it's null
UPDATE "dungeon_runs" SET "created_at" = "start_time" WHERE "created_at" IS NULL;