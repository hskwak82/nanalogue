-- Add input_mode preference for users
-- 'voice' = Voice conversation mode (auto TTS playback + auto STT start)
-- 'text' = Text conversation mode (TTS/STT auto features disabled)

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS input_mode TEXT DEFAULT 'voice'
CHECK (input_mode IN ('voice', 'text'));

COMMENT ON COLUMN user_preferences.input_mode IS
'User preferred input mode for diary sessions. voice=auto TTS/STT, text=manual only.';
