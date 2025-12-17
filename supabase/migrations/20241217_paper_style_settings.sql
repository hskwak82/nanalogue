-- Paper Style Settings Migration
-- Created: 2024-12-17
-- Add paper opacity, font family, and font color settings

-- Add new columns to diary_customization table
ALTER TABLE diary_customization
ADD COLUMN IF NOT EXISTS paper_opacity DECIMAL(3,2) DEFAULT 1.0 CHECK (paper_opacity >= 0 AND paper_opacity <= 1),
ADD COLUMN IF NOT EXISTS paper_font_family TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS paper_font_color TEXT DEFAULT '#333333';

-- Add new columns to diaries table
ALTER TABLE diaries
ADD COLUMN IF NOT EXISTS paper_opacity DECIMAL(3,2) DEFAULT 1.0 CHECK (paper_opacity >= 0 AND paper_opacity <= 1),
ADD COLUMN IF NOT EXISTS paper_font_family TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS paper_font_color TEXT DEFAULT '#333333';

-- Add comments for documentation
COMMENT ON COLUMN diary_customization.paper_opacity IS 'Background image opacity (0.0 to 1.0)';
COMMENT ON COLUMN diary_customization.paper_font_family IS 'Font family for diary text';
COMMENT ON COLUMN diary_customization.paper_font_color IS 'Hex color for diary text';

COMMENT ON COLUMN diaries.paper_opacity IS 'Background image opacity (0.0 to 1.0)';
COMMENT ON COLUMN diaries.paper_font_family IS 'Font family for diary text';
COMMENT ON COLUMN diaries.paper_font_color IS 'Hex color for diary text';
