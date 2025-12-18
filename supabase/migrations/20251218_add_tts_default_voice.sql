-- Add default voice to system settings (admin defaults)
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS tts_default_voice TEXT;

COMMENT ON COLUMN system_settings.tts_default_voice IS 'Default voice ID for the active TTS provider';

-- Add speaking rate to user preferences (personal settings)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS tts_speaking_rate DECIMAL(3,2);

COMMENT ON COLUMN user_preferences.tts_speaking_rate IS 'Personal TTS speaking rate override (null = use system default)';
