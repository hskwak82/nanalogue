-- ============================================
-- 005: Publishing System (PDF Generation, Spine Templates)
-- Consolidated from: publishing_jobs, spine_templates_table, etc.
-- ============================================

-- ============================================
-- DIARY_PUBLISH_JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS diary_publish_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diary_id UUID NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Generated PDF URLs
  front_cover_url TEXT,
  back_cover_url TEXT,
  spine_url TEXT,
  inner_pages_url TEXT,
  complete_package_url TEXT,
  zip_url TEXT,

  -- Job metadata
  error_message TEXT,
  page_count INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT unique_pending_job_per_diary UNIQUE (diary_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_publish_jobs_diary_id ON diary_publish_jobs(diary_id);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_admin_user_id ON diary_publish_jobs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON diary_publish_jobs(status);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_created_at ON diary_publish_jobs(created_at DESC);

ALTER TABLE diary_publish_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage publish jobs" ON diary_publish_jobs
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

-- ============================================
-- SPINE_TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS spine_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  background TEXT NOT NULL,
  top_band_color TEXT,
  top_band_height TEXT,
  bottom_band_color TEXT,
  bottom_band_height TEXT,
  text_color TEXT NOT NULL DEFAULT '#4A4A4A',
  is_free BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE spine_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active spine templates" ON spine_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage spine templates" ON spine_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid())
  );

-- Seed: Free solid presets
INSERT INTO spine_templates (id, name, background, text_color, is_free, sort_order) VALUES
  ('lavender', '라벤더', '#E8E0F0', '#4A4A4A', true, 1),
  ('mint', '민트', '#B8E6D4', '#2D5A4A', true, 2),
  ('rose', '로즈', '#F4D4D4', '#8B4A4A', true, 3),
  ('cream', '크림', '#FFF8E7', '#6B5A3A', true, 4),
  ('peach', '피치', '#FFDAB9', '#8B5A2B', true, 5),
  ('skyblue', '스카이블루', '#B0E0E6', '#2F4F4F', true, 6),
  ('lemon', '레몬', '#FFFACD', '#6B6B3A', true, 7),
  ('coral', '코랄', '#FFB4A2', '#6B3A3A', true, 8)
ON CONFLICT (id) DO NOTHING;

-- Seed: Free gradient presets
INSERT INTO spine_templates (id, name, background, text_color, is_free, sort_order) VALUES
  ('sky', '하늘', 'linear-gradient(180deg, #87CEEB 0%, #E0F4FF 100%)', '#2A5A7A', true, 9),
  ('sunset', '노을', 'linear-gradient(180deg, #FFB366 0%, #FF8C66 100%)', '#5A2A1A', true, 10)
ON CONFLICT (id) DO NOTHING;

-- Seed: Free presets with bands
INSERT INTO spine_templates (id, name, background, top_band_color, top_band_height, bottom_band_color, bottom_band_height, text_color, is_free, sort_order) VALUES
  ('classic', '클래식', '#F5DEB3', '#8B4513', '12%', '#8B4513', '12%', '#5A3A1A', true, 11),
  ('modern', '모던', '#2C3E50', '#E74C3C', '8%', NULL, NULL, '#FFFFFF', true, 12)
ON CONFLICT (id) DO NOTHING;

-- Seed: Premium presets
INSERT INTO spine_templates (id, name, background, text_color, is_free, sort_order) VALUES
  ('gold', '골드', 'linear-gradient(180deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)', '#4A3A1A', false, 13),
  ('rosegold', '로즈골드', 'linear-gradient(180deg, #E8B4B8 0%, #F5D0C5 50%, #E8B4B8 100%)', '#6B4A4A', false, 14),
  ('silver', '실버', 'linear-gradient(180deg, #C0C0C0 0%, #E8E8E8 50%, #C0C0C0 100%)', '#3A3A3A', false, 15),
  ('navy', '네이비', '#1E3A5F', '#D4AF37', false, 16),
  ('burgundy', '버건디', '#722F37', '#F5DEB3', false, 17),
  ('emerald', '에메랄드', '#046307', '#F5F5DC', false, 18),
  ('aurora', '오로라', 'linear-gradient(180deg, #A8E6CF 0%, #88D8B0 25%, #7FCDCD 50%, #B8A9C9 75%, #DDA0DD 100%)', '#2A4A3A', false, 19),
  ('galaxy', '갤럭시', 'linear-gradient(180deg, #0F0C29 0%, #302B63 50%, #24243E 100%)', '#E8E0F0', false, 20),
  ('ocean', '오션', 'linear-gradient(180deg, #006994 0%, #0099B4 50%, #48D1CC 100%)', '#FFFFFF', false, 21)
ON CONFLICT (id) DO NOTHING;

-- Seed: Premium presets with bands
INSERT INTO spine_templates (id, name, background, top_band_color, top_band_height, bottom_band_color, bottom_band_height, text_color, is_free, sort_order) VALUES
  ('leather', '레더', '#8B4513', '#D4AF37', '6%', '#D4AF37', '6%', '#F5DEB3', false, 24),
  ('velvet', '벨벳', '#800020', '#FFD700', '5%', '#FFD700', '5%', '#FFD700', false, 25),
  ('vintage', '빈티지', '#D2B48C', '#654321', '10%', '#654321', '10%', '#3E2723', false, 27)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_spine_templates_active ON spine_templates(is_active, sort_order);

COMMENT ON TABLE diary_publish_jobs IS 'Tracks PDF generation jobs for diary book publishing';
COMMENT ON COLUMN diary_publish_jobs.zip_url IS 'URL to ZIP file containing all publishing PDFs';
