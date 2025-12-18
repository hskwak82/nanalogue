-- Migration: Add spine_preset_id column for preset-based spine customization
-- This replaces the cover image crop approach with predefined spine styles

-- Add spine_preset_id column with default value
ALTER TABLE diaries ADD COLUMN IF NOT EXISTS spine_preset_id TEXT DEFAULT 'lavender';

-- Comment explaining the column
COMMENT ON COLUMN diaries.spine_preset_id IS 'ID of the spine preset style (e.g., lavender, mint, classic). References SPINE_PRESETS in src/types/spine.ts';
