-- Add speaking rate to system settings
-- Range: 0.5 (slow) to 2.0 (fast), default 1.0 (normal)

ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS tts_speaking_rate DECIMAL(3,2) DEFAULT 1.0;

COMMENT ON COLUMN system_settings.tts_speaking_rate IS 'TTS speaking rate: 0.5 (slow) to 2.0 (fast), default 1.0';
