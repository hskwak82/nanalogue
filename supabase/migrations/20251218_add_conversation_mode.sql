-- Add conversation mode to system settings
-- 'classic': Traditional STT → LLM → TTS flow (Google/Naver)
-- 'realtime': OpenAI Realtime API for natural conversation

ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS conversation_mode TEXT DEFAULT 'classic';

-- OpenAI Realtime specific settings
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS realtime_voice TEXT DEFAULT 'alloy';

ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS realtime_instructions TEXT;

COMMENT ON COLUMN system_settings.conversation_mode IS 'Conversation mode: classic (STT→LLM→TTS) or realtime (OpenAI Realtime API)';
COMMENT ON COLUMN system_settings.realtime_voice IS 'OpenAI Realtime voice: alloy, ash, ballad, coral, echo, sage, shimmer, verse';
COMMENT ON COLUMN system_settings.realtime_instructions IS 'System instructions for OpenAI Realtime conversations';
