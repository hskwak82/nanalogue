-- Migration: Create spine_templates table for admin-manageable spine presets
-- This allows admins to manage spine presets through the admin panel

-- Create spine_templates table
CREATE TABLE IF NOT EXISTS spine_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  background TEXT NOT NULL,              -- CSS background value (color or gradient)
  top_band_color TEXT,                   -- Optional top band color
  top_band_height TEXT,                  -- Optional top band height (e.g., '12%')
  bottom_band_color TEXT,                -- Optional bottom band color
  bottom_band_height TEXT,               -- Optional bottom band height (e.g., '12%')
  text_color TEXT NOT NULL DEFAULT '#4A4A4A',
  is_free BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE spine_templates ENABLE ROW LEVEL SECURITY;

-- Public read access for active templates
CREATE POLICY "Anyone can view active spine templates"
  ON spine_templates FOR SELECT
  USING (is_active = true);

-- Admin write access
CREATE POLICY "Admins can manage spine templates"
  ON spine_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Seed with existing presets (FREE)
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

-- Seed gradient presets (FREE)
INSERT INTO spine_templates (id, name, background, text_color, is_free, sort_order) VALUES
  ('sky', '하늘', 'linear-gradient(180deg, #87CEEB 0%, #E0F4FF 100%)', '#2A5A7A', true, 9),
  ('sunset', '노을', 'linear-gradient(180deg, #FFB366 0%, #FF8C66 100%)', '#5A2A1A', true, 10)
ON CONFLICT (id) DO NOTHING;

-- Seed presets with bands (FREE)
INSERT INTO spine_templates (id, name, background, top_band_color, top_band_height, bottom_band_color, bottom_band_height, text_color, is_free, sort_order) VALUES
  ('classic', '클래식', '#F5DEB3', '#8B4513', '12%', '#8B4513', '12%', '#5A3A1A', true, 11),
  ('modern', '모던', '#2C3E50', '#E74C3C', '8%', NULL, NULL, '#FFFFFF', true, 12)
ON CONFLICT (id) DO NOTHING;

-- Seed PREMIUM presets
INSERT INTO spine_templates (id, name, background, text_color, is_free, sort_order) VALUES
  ('gold', '골드', 'linear-gradient(180deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)', '#4A3A1A', false, 13),
  ('rosegold', '로즈골드', 'linear-gradient(180deg, #E8B4B8 0%, #F5D0C5 50%, #E8B4B8 100%)', '#6B4A4A', false, 14),
  ('silver', '실버', 'linear-gradient(180deg, #C0C0C0 0%, #E8E8E8 50%, #C0C0C0 100%)', '#3A3A3A', false, 15),
  ('navy', '네이비', '#1E3A5F', '#D4AF37', false, 16),
  ('burgundy', '버건디', '#722F37', '#F5DEB3', false, 17),
  ('emerald', '에메랄드', '#046307', '#F5F5DC', false, 18)
ON CONFLICT (id) DO NOTHING;

-- Seed premium gradient presets
INSERT INTO spine_templates (id, name, background, text_color, is_free, sort_order) VALUES
  ('aurora', '오로라', 'linear-gradient(180deg, #A8E6CF 0%, #88D8B0 25%, #7FCDCD 50%, #B8A9C9 75%, #DDA0DD 100%)', '#2A4A3A', false, 19),
  ('galaxy', '갤럭시', 'linear-gradient(180deg, #0F0C29 0%, #302B63 50%, #24243E 100%)', '#E8E0F0', false, 20),
  ('ocean', '오션', 'linear-gradient(180deg, #006994 0%, #0099B4 50%, #48D1CC 100%)', '#FFFFFF', false, 21),
  ('cherry', '체리블라썸', 'linear-gradient(180deg, #FFB7C5 0%, #FF69B4 50%, #FFB7C5 100%)', '#4A1A2A', false, 22),
  ('forest', '포레스트', 'linear-gradient(180deg, #228B22 0%, #2E8B57 50%, #3CB371 100%)', '#F5F5DC', false, 23)
ON CONFLICT (id) DO NOTHING;

-- Seed premium presets with bands
INSERT INTO spine_templates (id, name, background, top_band_color, top_band_height, bottom_band_color, bottom_band_height, text_color, is_free, sort_order) VALUES
  ('leather', '레더', '#8B4513', '#D4AF37', '6%', '#D4AF37', '6%', '#F5DEB3', false, 24),
  ('velvet', '벨벳', '#800020', '#FFD700', '5%', '#FFD700', '5%', '#FFD700', false, 25),
  ('marble', '마블', 'linear-gradient(180deg, #F5F5F5 0%, #E8E8E8 25%, #F0F0F0 50%, #D8D8D8 75%, #F5F5F5 100%)', '#2C3E50', '4%', '#2C3E50', '4%', '#2C3E50', false, 26),
  ('vintage', '빈티지', '#D2B48C', '#654321', '10%', '#654321', '10%', '#3E2723', false, 27),
  ('royal', '로얄', '#4B0082', '#FFD700', '8%', '#FFD700', '8%', '#FFD700', false, 28),
  ('midnight', '미드나잇', 'linear-gradient(180deg, #191970 0%, #000080 50%, #191970 100%)', '#C0C0C0', '3%', '#C0C0C0', '3%', '#E8E8E8', false, 29)
ON CONFLICT (id) DO NOTHING;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_spine_templates_active ON spine_templates(is_active, sort_order);
