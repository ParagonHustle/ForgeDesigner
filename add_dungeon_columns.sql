-- Add dungeon_type_id column to dungeon_runs table if it doesn't exist
ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS dungeon_type_id INTEGER;

-- Add elemental_type column to dungeon_runs table if it doesn't exist
ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS elemental_type TEXT;

-- Add total_stages column to dungeon_runs table if it doesn't exist
ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS total_stages INTEGER DEFAULT 8;

-- Add battle_log column to dungeon_runs table if it doesn't exist
ALTER TABLE dungeon_runs ADD COLUMN IF NOT EXISTS battle_log JSONB;