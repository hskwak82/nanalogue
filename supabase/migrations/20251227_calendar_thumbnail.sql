-- Migration: add thumbnail_crop_data to daily_sessions
-- This stores the crop settings for calendar thumbnail display

ALTER TABLE daily_sessions
ADD COLUMN IF NOT EXISTS thumbnail_crop_data JSONB;

-- Add comment for documentation
COMMENT ON COLUMN daily_sessions.thumbnail_crop_data IS 'Stores thumbnail crop settings: {type: "center"|"manual"|"smart", crop: {x, y, width, height}, thumbnail_url?: string}';
