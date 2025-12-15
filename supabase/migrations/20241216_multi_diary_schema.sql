-- Multi-Diary (Volume) Schema Migration
-- Created: 2024-12-16
-- Purpose: Support multiple diary volumes with bookshelf view

-- ============================================
-- DIARIES TABLE (New)
-- ============================================
CREATE TABLE IF NOT EXISTS diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  volume_number INTEGER NOT NULL DEFAULT 1,
  title TEXT,  -- User-defined diary name (shown on cover/spine)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,  -- Set when diary is "finished"

  -- Customization (moved from diary_customization)
  cover_template_id UUID REFERENCES cover_templates(id),
  paper_template_id UUID REFERENCES paper_templates(id),
  cover_decorations JSONB DEFAULT '[]'::jsonb,

  -- Spine metadata (for bookshelf view)
  spine_color TEXT,
  spine_gradient TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique volume numbers per user
  UNIQUE(user_id, volume_number)
);

-- Enable RLS
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own diaries" ON diaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own diaries" ON diaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diaries" ON diaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diaries" ON diaries
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_diaries_user_id ON diaries(user_id);
CREATE INDEX IF NOT EXISTS idx_diaries_user_status ON diaries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_diaries_user_volume ON diaries(user_id, volume_number);

-- Trigger for updated_at
CREATE TRIGGER update_diaries_updated_at
  BEFORE UPDATE ON diaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MODIFY DIARY_ENTRIES TABLE
-- ============================================
-- Add diary_id column to link entries to specific diary
ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS diary_id UUID REFERENCES diaries(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_diary_entries_diary_id ON diary_entries(diary_id);

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================

-- 1. Create first diary for users with existing customization
INSERT INTO diaries (
  user_id,
  volume_number,
  title,
  status,
  start_date,
  cover_template_id,
  paper_template_id,
  cover_decorations,
  created_at
)
SELECT
  dc.user_id,
  1 as volume_number,
  '나의 일기장' as title,
  'active' as status,
  COALESCE(
    (SELECT MIN(de.entry_date) FROM diary_entries de WHERE de.user_id = dc.user_id),
    dc.created_at::date
  ) as start_date,
  dc.cover_template_id,
  dc.paper_template_id,
  dc.cover_decorations,
  dc.created_at
FROM diary_customization dc
ON CONFLICT (user_id, volume_number) DO NOTHING;

-- 2. Create first diary for users with entries but no customization
INSERT INTO diaries (user_id, volume_number, title, status, start_date)
SELECT DISTINCT
  de.user_id,
  1,
  '나의 일기장',
  'active',
  MIN(de.entry_date)
FROM diary_entries de
WHERE de.user_id NOT IN (SELECT user_id FROM diaries)
GROUP BY de.user_id
ON CONFLICT (user_id, volume_number) DO NOTHING;

-- 3. Link existing diary_entries to their user's first diary
UPDATE diary_entries de
SET diary_id = (
  SELECT d.id FROM diaries d
  WHERE d.user_id = de.user_id
  AND d.volume_number = 1
  LIMIT 1
)
WHERE de.diary_id IS NULL;

-- ============================================
-- HELPFUL FUNCTIONS
-- ============================================

-- Function to get next volume number for a user
CREATE OR REPLACE FUNCTION get_next_volume_number(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(volume_number) + 1 FROM diaries WHERE user_id = p_user_id),
    1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get entry count for a diary
CREATE OR REPLACE FUNCTION get_diary_entry_count(p_diary_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM diary_entries WHERE diary_id = p_diary_id);
END;
$$ LANGUAGE plpgsql;
