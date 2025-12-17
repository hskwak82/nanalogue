-- Add spine_position column to diaries table
-- This stores the X position (0-70%) for the spine region selector

ALTER TABLE diaries
ADD COLUMN IF NOT EXISTS spine_position REAL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN diaries.spine_position IS 'Spine region X position as percentage (0-70), used for spine image capture';
