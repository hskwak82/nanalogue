-- Paper Decorations Migration
-- Created: 2024-12-16
-- Add paper_decorations column to diaries table

-- Add paper_decorations column
ALTER TABLE diaries
ADD COLUMN IF NOT EXISTS paper_decorations JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN diaries.paper_decorations IS 'JSON array of decoration items placed on inner pages (watermarks, corner decorations, etc.)';
