-- ============================================
-- 001: Diary Customization System
-- Consolidated from: diary_customization_tables, seed_default_items,
-- paper_decorations, paper_style_settings, cover_image_url, premium_cover_templates
-- ============================================

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

ALTER TABLE cover_templates ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE paper_templates ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE decoration_items ENABLE ROW LEVEL SECURITY;

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
  paper_decorations JSONB DEFAULT '[]'::jsonb,
  paper_opacity DECIMAL(3,2) DEFAULT 1.0 CHECK (paper_opacity >= 0 AND paper_opacity <= 1),
  paper_font_family TEXT DEFAULT 'default',
  paper_font_color TEXT DEFAULT '#333333',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diary_customization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customization" ON diary_customization
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own customization" ON diary_customization
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customization" ON diary_customization
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customization" ON diary_customization
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS & INDEXES
-- ============================================
CREATE TRIGGER update_diary_customization_updated_at
  BEFORE UPDATE ON diary_customization
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_cover_templates_category ON cover_templates(category);
CREATE INDEX IF NOT EXISTS idx_cover_templates_sort ON cover_templates(sort_order);
CREATE INDEX IF NOT EXISTS idx_decoration_items_category ON decoration_items(category);
CREATE INDEX IF NOT EXISTS idx_decoration_items_type ON decoration_items(item_type);

-- ============================================
-- SEED: COVER TEMPLATES (Free defaults)
-- ============================================
INSERT INTO cover_templates (name, description, image_url, category, is_free, sort_order) VALUES
('파스텔 라벤더', '부드러운 라벤더 그라데이션', 'gradient:linear-gradient(135deg, #E8E0F0 0%, #D4C5E2 50%, #C9B8DA 100%)', 'pastel', true, 1),
('파스텔 민트', '상쾌한 민트 그라데이션', 'gradient:linear-gradient(135deg, #D4EDE4 0%, #B8D4C8 50%, #A8C9BB 100%)', 'pastel', true, 2),
('파스텔 피치', '따뜻한 피치 그라데이션', 'gradient:linear-gradient(135deg, #FCE8E0 0%, #F5D0C0 50%, #EDBFAF 100%)', 'pastel', true, 3),
('파스텔 핑크', '로맨틱한 핑크 그라데이션', 'gradient:linear-gradient(135deg, #FFE8F0 0%, #FFD0E0 50%, #F5C0D5 100%)', 'pastel', true, 4),
('파스텔 블루', '차분한 블루 그라데이션', 'gradient:linear-gradient(135deg, #E0E8F5 0%, #C5D4EA 50%, #B0C4DE 100%)', 'pastel', true, 5),
('크림', '따뜻한 크림색', 'solid:#FAF8F5', 'solid', true, 10),
('화이트', '깔끔한 흰색', 'solid:#FFFFFF', 'solid', true, 11),
('소프트 그레이', '부드러운 회색', 'solid:#F5F5F5', 'solid', true, 12)
ON CONFLICT DO NOTHING;

-- Premium Cover Templates
INSERT INTO cover_templates (name, description, image_url, category, is_free, sort_order) VALUES
('벨벳 버건디', '고급스러운 버건디 벨벳 질감', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop', 'texture', false, 101),
('네이비 레더', '클래식한 네이비 가죽 질감', 'https://images.unsplash.com/photo-1531685250784-7569952593d2?w=400&h=600&fit=crop', 'texture', false, 102),
('린넨 베이지', '따뜻한 린넨 패브릭 느낌', 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&h=600&fit=crop', 'texture', false, 103),
('빈티지 페이퍼', '오래된 종이 질감의 빈티지 스타일', 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=400&h=600&fit=crop', 'texture', false, 104),
('화이트 마블', '우아한 흰색 대리석 패턴', 'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=400&h=600&fit=crop', 'marble', false, 111),
('핑크 마블', '로맨틱한 핑크 대리석 패턴', 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=600&fit=crop', 'marble', false, 112),
('다크 마블', '시크한 다크 대리석 패턴', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop', 'marble', false, 113),
('블루밍 로즈', '화사한 장미꽃 패턴', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=600&fit=crop', 'botanical', false, 121),
('트로피컬 리프', '싱그러운 열대 나뭇잎', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=600&fit=crop', 'botanical', false, 122),
('체리블라썸', '은은한 벚꽃 일러스트', 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&h=600&fit=crop', 'botanical', false, 123),
('와일드플라워', '들꽃이 수놓인 패턴', 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=600&fit=crop', 'botanical', false, 124),
('골드 브러시', '금색 붓터치 아트웍', 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=600&fit=crop', 'artistic', false, 131),
('수채화 블루', '부드러운 파란 수채화', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=600&fit=crop', 'artistic', false, 132),
('오로라', '몽환적인 오로라 그라데이션', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=600&fit=crop', 'artistic', false, 134),
('모던 블랙', '세련된 블랙 미니멀', 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400&h=600&fit=crop', 'minimal', false, 141),
('스타리 나잇', '별이 빛나는 밤하늘', 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=600&fit=crop', 'galaxy', false, 151),
('갤럭시 드림', '신비로운 은하수', 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=600&fit=crop', 'galaxy', false, 152)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED: PAPER TEMPLATES
-- ============================================
INSERT INTO paper_templates (name, background_color, line_style, line_color, is_free, sort_order) VALUES
('무지', '#FFFFFF', 'none', '#E5E5E5', true, 1),
('줄노트', '#FFFFFF', 'lined', '#E0E0E0', true, 2),
('격자', '#FFFFFF', 'grid', '#E8E8E8', true, 3),
('점선', '#FFFFFF', 'dotted', '#D0D0D0', true, 4),
('크림 무지', '#FAF8F5', 'none', '#E5E5E5', true, 10),
('크림 줄노트', '#FAF8F5', 'lined', '#E0D8D0', true, 11),
('라벤더 무지', '#F5F0FA', 'none', '#E5E5E5', true, 12),
('민트 무지', '#F0FAF5', 'none', '#E5E5E5', true, 13)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED: DECORATION ITEMS (Emojis)
-- ============================================
INSERT INTO decoration_items (name, item_type, content, category, is_free, sort_order) VALUES
-- Nature
('벚꽃', 'emoji', '🌸', 'nature', true, 1),
('해바라기', 'emoji', '🌻', 'nature', true, 2),
('튤립', 'emoji', '🌷', 'nature', true, 3),
('장미', 'emoji', '🌹', 'nature', true, 4),
('클로버', 'emoji', '🍀', 'nature', true, 7),
('나뭇잎', 'emoji', '🌿', 'nature', true, 9),
('새싹', 'emoji', '🌱', 'nature', true, 10),
-- Hearts
('빨간하트', 'emoji', '❤️', 'hearts', true, 1),
('보라하트', 'emoji', '💜', 'hearts', true, 2),
('파란하트', 'emoji', '💙', 'hearts', true, 3),
('핑크하트', 'emoji', '💗', 'hearts', true, 7),
('반짝하트', 'emoji', '💖', 'hearts', true, 10),
-- Stars
('별', 'emoji', '⭐', 'stars', true, 1),
('반짝별', 'emoji', '✨', 'stars', true, 2),
('초승달', 'emoji', '🌙', 'stars', true, 4),
('태양', 'emoji', '☀️', 'stars', true, 6),
('무지개', 'emoji', '🌈', 'stars', true, 8),
-- Animals
('토끼', 'emoji', '🐰', 'animals', true, 1),
('곰', 'emoji', '🐻', 'animals', true, 2),
('고양이', 'emoji', '🐱', 'animals', true, 3),
('강아지', 'emoji', '🐶', 'animals', true, 4),
('나비', 'emoji', '🦋', 'animals', true, 5),
('유니콘', 'emoji', '🦄', 'animals', true, 12),
-- Food
('케이크', 'emoji', '🎂', 'food', true, 1),
('컵케이크', 'emoji', '🧁', 'food', true, 3),
('커피', 'emoji', '☕', 'food', true, 6),
('아이스크림', 'emoji', '🍦', 'food', true, 8),
('딸기', 'emoji', '🍓', 'food', true, 11),
-- Objects
('책', 'emoji', '📖', 'objects', true, 1),
('연필', 'emoji', '✏️', 'objects', true, 2),
('노트', 'emoji', '📝', 'objects', true, 4),
('편지', 'emoji', '💌', 'objects', true, 5),
('선물', 'emoji', '🎁', 'objects', true, 6),
('리본', 'emoji', '🎀', 'objects', true, 7),
('왕관', 'emoji', '👑', 'objects', true, 9),
('다이아몬드', 'emoji', '💎', 'objects', true, 10)
ON CONFLICT DO NOTHING;

-- SVG Icons
INSERT INTO decoration_items (name, item_type, content, category, is_free, sort_order) VALUES
('원', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>', 'shapes', true, 1),
('하트', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>', 'shapes', true, 2),
('별', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>', 'shapes', true, 3)
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN diary_customization.paper_opacity IS 'Background image opacity (0.0 to 1.0)';
COMMENT ON COLUMN diary_customization.paper_font_family IS 'Font family for diary text';
COMMENT ON COLUMN diary_customization.paper_font_color IS 'Hex color for diary text';
