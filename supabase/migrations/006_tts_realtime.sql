-- ============================================
-- 006: TTS & Realtime Conversation System
-- Consolidated from: tts_provider_settings, add_conversation_mode,
-- add_realtime_provider, add_tts_default_voice, add_tts_speaking_rate,
-- add_user_realtime_voice
-- ============================================

-- ============================================
-- SYSTEM_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  tts_provider TEXT DEFAULT 'google',
  tts_default_voice TEXT,
  tts_speaking_rate DECIMAL(3,2) DEFAULT 1.0,
  conversation_mode TEXT DEFAULT 'classic',
  realtime_provider TEXT DEFAULT 'openai',
  realtime_voice TEXT DEFAULT 'alloy',
  realtime_instructions TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings if not exists
INSERT INTO system_settings (id, tts_provider)
VALUES ('default', 'google')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE system_settings IS 'Global system settings including TTS provider configuration';
COMMENT ON COLUMN system_settings.tts_provider IS 'Active TTS provider ID (google, naver, etc.)';
COMMENT ON COLUMN system_settings.tts_default_voice IS 'Default voice ID for the active TTS provider';
COMMENT ON COLUMN system_settings.tts_speaking_rate IS 'TTS speaking rate: 0.5 (slow) to 2.0 (fast), default 1.0';
COMMENT ON COLUMN system_settings.conversation_mode IS 'Conversation mode: classic (STT→LLM→TTS) or realtime (OpenAI Realtime API)';
COMMENT ON COLUMN system_settings.realtime_provider IS 'Realtime voice provider: openai or gemini';
COMMENT ON COLUMN system_settings.realtime_voice IS 'OpenAI Realtime voice: alloy, ash, ballad, coral, echo, sage, shimmer, verse';
COMMENT ON COLUMN system_settings.realtime_instructions IS 'System instructions for OpenAI Realtime conversations';

-- ============================================
-- USER_PREFERENCES TABLE (TTS/Realtime settings)
-- ============================================
-- Add columns to existing user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS tts_speaking_rate DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS realtime_voice TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS input_mode TEXT DEFAULT 'voice' CHECK (input_mode IN ('voice', 'text'));

COMMENT ON COLUMN user_preferences.tts_speaking_rate IS 'Personal TTS speaking rate override (null = use system default)';
COMMENT ON COLUMN user_preferences.realtime_voice IS 'User preferred realtime voice. NULL means use system default.';
COMMENT ON COLUMN user_preferences.input_mode IS 'User preferred input mode. voice=auto TTS/STT, text=manual only.';
