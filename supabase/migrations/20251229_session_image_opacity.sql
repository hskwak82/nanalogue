-- Migration: add session_image_opacity to diary_entries
-- This allows users to control the opacity of session images displayed as paper background

ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS session_image_opacity DECIMAL(3,2) DEFAULT 0.15;

-- Default 0.15 = 15% opacity for text readability
-- Range: 0.00 (transparent) to 1.00 (opaque)

COMMENT ON COLUMN diary_entries.session_image_opacity IS 'Opacity of session image when displayed as paper background (0.00-1.00, default 0.15)';
