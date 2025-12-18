-- TTS Provider Settings
-- This migration adds tables for managing TTS provider configuration

-- System settings table (single row for global settings)
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  tts_provider TEXT DEFAULT 'google',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings if not exists
INSERT INTO system_settings (id, tts_provider)
VALUES ('default', 'google')
ON CONFLICT (id) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE system_settings IS 'Global system settings including TTS provider configuration';
COMMENT ON COLUMN system_settings.tts_provider IS 'Active TTS provider ID (google, naver, etc.)';
