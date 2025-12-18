-- Add realtime voice preference for users
-- Users can override the system default realtime voice

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS realtime_voice TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN user_preferences.realtime_voice IS 'User preferred realtime voice (alloy, ash, ballad, coral, echo, sage, shimmer, verse). NULL means use system default.';
