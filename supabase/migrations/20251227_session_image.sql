-- Add session_image_url column to daily_sessions
-- This stores the image uploaded at conversation start for AI analysis and calendar display

ALTER TABLE daily_sessions
ADD COLUMN IF NOT EXISTS session_image_url TEXT;

-- Add index for faster lookups when displaying images in calendar
CREATE INDEX IF NOT EXISTS idx_daily_sessions_image_url
ON daily_sessions(session_image_url)
WHERE session_image_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN daily_sessions.session_image_url IS 'URL of image uploaded at conversation start, used for AI analysis and calendar display';
