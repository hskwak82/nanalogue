-- Add realtime_provider column to system_settings
-- Allows selection between OpenAI and Gemini for realtime voice conversations

ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS realtime_provider TEXT DEFAULT 'openai';

-- Add comment
COMMENT ON COLUMN system_settings.realtime_provider IS 'Realtime voice provider: openai or gemini';
