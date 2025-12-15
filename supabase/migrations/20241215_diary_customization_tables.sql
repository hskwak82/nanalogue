-- Diary Customization Tables Migration
-- Created: 2024-12-15

-- ============================================
-- COVER_TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cover_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  image_url TEXT NOT NULL,
  category TEXT DEFAULT 'default',
  is_free BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cover_templates ENABLE ROW LEVEL SECURITY;

-- Policies (templates are public read)
CREATE POLICY "Anyone can view active templates" ON cover_templates
  FOR SELECT USING (is_active = true);

-- ============================================
-- PAPER_TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS paper_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  thumbnail_url TEXT,
  background_color TEXT DEFAULT '#FFFFFF',
  background_image_url TEXT,
  line_style TEXT DEFAULT 'none' CHECK (line_style IN ('none', 'lined', 'grid', 'dotted')),
  line_color TEXT DEFAULT '#E5E5E5',
  is_free BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE paper_templates ENABLE ROW LEVEL SECURITY;

-- Policies (templates are public read)
CREATE POLICY "Anyone can view active paper templates" ON paper_templates
  FOR SELECT USING (is_active = true);

-- ============================================
-- DECORATION_ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS decoration_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('emoji', 'icon', 'sticker')),
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_free BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE decoration_items ENABLE ROW LEVEL SECURITY;

-- Policies (items are public read)
CREATE POLICY "Anyone can view active decoration items" ON decoration_items
  FOR SELECT USING (is_active = true);

-- ============================================
-- DIARY_CUSTOMIZATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS diary_customization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cover_template_id UUID REFERENCES cover_templates(id),
  paper_template_id UUID REFERENCES paper_templates(id),
  cover_decorations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE diary_customization ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own customization" ON diary_customization
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own customization" ON diary_customization
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customization" ON diary_customization
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customization" ON diary_customization
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_diary_customization_updated_at
  BEFORE UPDATE ON diary_customization
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cover_templates_category ON cover_templates(category);
CREATE INDEX IF NOT EXISTS idx_cover_templates_sort ON cover_templates(sort_order);
CREATE INDEX IF NOT EXISTS idx_decoration_items_category ON decoration_items(category);
CREATE INDEX IF NOT EXISTS idx_decoration_items_type ON decoration_items(item_type);
