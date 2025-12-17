-- Add spine_position and spine_width columns to diaries table
-- spine_position: X position (0-70%) for the spine region selector
-- spine_width: Width ratio of spine (default 30% of cover width)

ALTER TABLE diaries
ADD COLUMN IF NOT EXISTS spine_position REAL DEFAULT 0;

ALTER TABLE diaries
ADD COLUMN IF NOT EXISTS spine_width REAL DEFAULT 0.30;

-- Add comments for documentation
COMMENT ON COLUMN diaries.spine_position IS 'Spine region X position as percentage (0-70), used for spine image capture';
COMMENT ON COLUMN diaries.spine_width IS 'Spine width as ratio of cover width (default 0.30 = 30%)';
