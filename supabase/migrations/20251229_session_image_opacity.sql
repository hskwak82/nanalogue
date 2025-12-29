-- Migration: add session_image_opacity and session_font_color to diary_entries
-- This allows users to control the opacity of session images and font color per entry

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS session_image_opacity DECIMAL(3,2) DEFAULT 0.15;

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS session_font_color TEXT DEFAULT NULL;

-- session_image_opacity: 0.00 (transparent) to 1.00 (opaque), default 0.15
-- session_font_color: NULL means use diary default, otherwise hex color like '#333333'

COMMENT ON COLUMN diary_entries.session_image_opacity IS 'Opacity of session image when displayed as paper background (0.00-1.00, default 0.15)';
COMMENT ON COLUMN diary_entries.session_font_color IS 'Font color override for this entry (NULL = use diary default)';
