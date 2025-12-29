-- Migration: add session style columns to diary_entries
-- This allows users to control session image opacity, font color, size, and text background

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS session_image_opacity DECIMAL(3,2) DEFAULT 0.15;

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS session_font_color TEXT DEFAULT NULL;

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS session_font_size DECIMAL(3,1) DEFAULT NULL;

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS session_text_bg_opacity DECIMAL(3,2) DEFAULT NULL;

-- session_image_opacity: 0.00 (transparent) to 1.00 (opaque), default 0.15
-- session_font_color: NULL means use diary default, otherwise hex color like '#333333'
-- session_font_size: NULL means use default (1.0), range 0.8 to 1.5
-- session_text_bg_opacity: NULL means no background, 0.00 to 1.00 for semi-transparent white bg

COMMENT ON COLUMN diary_entries.session_image_opacity IS 'Opacity of session image when displayed as paper background (0.00-1.00, default 0.15)';
COMMENT ON COLUMN diary_entries.session_font_color IS 'Font color override for this entry (NULL = use diary default)';
COMMENT ON COLUMN diary_entries.session_font_size IS 'Font size multiplier for this entry (0.8-1.5, NULL = default 1.0)';
COMMENT ON COLUMN diary_entries.session_text_bg_opacity IS 'Text background opacity for readability (0.00-1.00, NULL = no background)';
