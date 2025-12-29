-- ============================================
-- 008: Session Features (Images, Calendar, Diary Style)
-- Consolidated from: session_image, calendar_thumbnail, session_image_opacity
-- ============================================

-- ============================================
-- DAILY_SESSIONS - Session Image Support
-- ============================================
ALTER TABLE daily_sessions
ADD COLUMN IF NOT EXISTS session_image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_crop_data JSONB;

CREATE INDEX IF NOT EXISTS idx_daily_sessions_image_url
ON daily_sessions(session_image_url)
WHERE session_image_url IS NOT NULL;

COMMENT ON COLUMN daily_sessions.session_image_url IS 'URL of image uploaded at conversation start, used for AI analysis and calendar display';
COMMENT ON COLUMN daily_sessions.thumbnail_crop_data IS 'Stores thumbnail crop settings: {type: "center"|"manual"|"smart", crop: {x, y, width, height}, thumbnail_url?: string}';

-- ============================================
-- DIARY_ENTRIES - Session Style Columns
-- ============================================
ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS session_image_opacity DECIMAL(3,2) DEFAULT 0.15,
ADD COLUMN IF NOT EXISTS session_font_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS session_font_size DECIMAL(3,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS session_text_bg_opacity DECIMAL(3,2) DEFAULT NULL;

COMMENT ON COLUMN diary_entries.session_image_opacity IS 'Opacity of session image when displayed as paper background (0.00-1.00, default 0.15)';
COMMENT ON COLUMN diary_entries.session_font_color IS 'Font color override for this entry (NULL = use diary default)';
COMMENT ON COLUMN diary_entries.session_font_size IS 'Font size multiplier for this entry (0.8-1.5, NULL = default 1.0)';
COMMENT ON COLUMN diary_entries.session_text_bg_opacity IS 'Text background opacity for readability (0.00-1.00, NULL = no background)';
