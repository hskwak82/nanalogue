-- Seed Default Items for Diary Customization
-- Created: 2024-12-15

-- ============================================
-- COVER TEMPLATES (Free defaults with CSS gradients)
-- ============================================
INSERT INTO cover_templates (name, description, image_url, category, is_free, sort_order) VALUES
-- Pastel gradients matching app theme
('파스텔 라벤더', '부드러운 라벤더 그라데이션', 'gradient:linear-gradient(135deg, #E8E0F0 0%, #D4C5E2 50%, #C9B8DA 100%)', 'pastel', true, 1),
('파스텔 민트', '상쾌한 민트 그라데이션', 'gradient:linear-gradient(135deg, #D4EDE4 0%, #B8D4C8 50%, #A8C9BB 100%)', 'pastel', true, 2),
('파스텔 피치', '따뜻한 피치 그라데이션', 'gradient:linear-gradient(135deg, #FCE8E0 0%, #F5D0C0 50%, #EDBFAF 100%)', 'pastel', true, 3),
('파스텔 핑크', '로맨틱한 핑크 그라데이션', 'gradient:linear-gradient(135deg, #FFE8F0 0%, #FFD0E0 50%, #F5C0D5 100%)', 'pastel', true, 4),
('파스텔 블루', '차분한 블루 그라데이션', 'gradient:linear-gradient(135deg, #E0E8F5 0%, #C5D4EA 50%, #B0C4DE 100%)', 'pastel', true, 5),
-- Solid colors
('크림', '따뜻한 크림색', 'solid:#FAF8F5', 'solid', true, 10),
('화이트', '깔끔한 흰색', 'solid:#FFFFFF', 'solid', true, 11),
('소프트 그레이', '부드러운 회색', 'solid:#F5F5F5', 'solid', true, 12);

-- ============================================
-- PAPER TEMPLATES (Free defaults)
-- ============================================
INSERT INTO paper_templates (name, background_color, line_style, line_color, is_free, sort_order) VALUES
-- Basic styles
('무지', '#FFFFFF', 'none', '#E5E5E5', true, 1),
('줄노트', '#FFFFFF', 'lined', '#E0E0E0', true, 2),
('격자', '#FFFFFF', 'grid', '#E8E8E8', true, 3),
('점선', '#FFFFFF', 'dotted', '#D0D0D0', true, 4),
-- Pastel backgrounds
('크림 무지', '#FAF8F5', 'none', '#E5E5E5', true, 10),
('크림 줄노트', '#FAF8F5', 'lined', '#E0D8D0', true, 11),
('라벤더 무지', '#F5F0FA', 'none', '#E5E5E5', true, 12),
('민트 무지', '#F0FAF5', 'none', '#E5E5E5', true, 13);

-- ============================================
-- DECORATION ITEMS - EMOJI (Free defaults)
-- ============================================

-- Flowers & Nature
INSERT INTO decoration_items (name, item_type, content, category, is_free, sort_order) VALUES
('벚꽃', 'emoji', '🌸', 'nature', true, 1),
('해바라기', 'emoji', '🌻', 'nature', true, 2),
('튤립', 'emoji', '🌷', 'nature', true, 3),
('장미', 'emoji', '🌹', 'nature', true, 4),
('꽃', 'emoji', '🌼', 'nature', true, 5),
('무궁화', 'emoji', '🌺', 'nature', true, 6),
('클로버', 'emoji', '🍀', 'nature', true, 7),
('네잎클로버', 'emoji', '☘️', 'nature', true, 8),
('나뭇잎', 'emoji', '🌿', 'nature', true, 9),
('새싹', 'emoji', '🌱', 'nature', true, 10),
('나무', 'emoji', '🌳', 'nature', true, 11),
('단풍', 'emoji', '🍁', 'nature', true, 12),
('선인장', 'emoji', '🌵', 'nature', true, 13);

-- Hearts
INSERT INTO decoration_items (name, item_type, content, category, is_free, sort_order) VALUES
('빨간하트', 'emoji', '❤️', 'hearts', true, 1),
('보라하트', 'emoji', '💜', 'hearts', true, 2),
('파란하트', 'emoji', '💙', 'hearts', true, 3),
('초록하트', 'emoji', '💚', 'hearts', true, 4),
('노란하트', 'emoji', '💛', 'hearts', true, 5),
('주황하트', 'emoji', '🧡', 'hearts', true, 6),
('핑크하트', 'emoji', '💗', 'hearts', true, 7),
('흰하트', 'emoji', '🤍', 'hearts', true, 8),
('검정하트', 'emoji', '🖤', 'hearts', true, 9),
('반짝하트', 'emoji', '💖', 'hearts', true, 10),
('두근하트', 'emoji', '💓', 'hearts', true, 11),
('하트눈', 'emoji', '😍', 'hearts', true, 12);

-- Stars & Weather
INSERT INTO decoration_items (name, item_type, content, category, is_free, sort_order) VALUES
('별', 'emoji', '⭐', 'stars', true, 1),
('반짝별', 'emoji', '✨', 'stars', true, 2),
('빛나는별', 'emoji', '🌟', 'stars', true, 3),
('초승달', 'emoji', '🌙', 'stars', true, 4),
('보름달', 'emoji', '🌕', 'stars', true, 5),
('태양', 'emoji', '☀️', 'stars', true, 6),
('해', 'emoji', '🌞', 'stars', true, 7),
('무지개', 'emoji', '🌈', 'stars', true, 8),
('구름', 'emoji', '☁️', 'stars', true, 9),
('비', 'emoji', '🌧️', 'stars', true, 10),
('눈', 'emoji', '❄️', 'stars', true, 11),
('번개', 'emoji', '⚡', 'stars', true, 12);

-- Animals
INSERT INTO decoration_items (name, item_type, content, category, is_free, sort_order) VALUES
('토끼', 'emoji', '🐰', 'animals', true, 1),
('곰', 'emoji', '🐻', 'animals', true, 2),
('고양이', 'emoji', '🐱', 'animals', true, 3),
('강아지', 'emoji', '🐶', 'animals', true, 4),
('나비', 'emoji', '🦋', 'animals', true, 5),
('꿀벌', 'emoji', '🐝', 'animals', true, 6),
('무당벌레', 'emoji', '🐞', 'animals', true, 7),
('새', 'emoji', '🐦', 'animals', true, 8),
('병아리', 'emoji', '🐥', 'animals', true, 9),
('여우', 'emoji', '🦊', 'animals', true, 10),
('팬더', 'emoji', '🐼', 'animals', true, 11),
('유니콘', 'emoji', '🦄', 'animals', true, 12);

-- Food & Drinks
INSERT INTO decoration_items (name, item_type, content, category, is_free, sort_order) VALUES
('케이크', 'emoji', '🎂', 'food', true, 1),
('조각케이크', 'emoji', '🍰', 'food', true, 2),
('컵케이크', 'emoji', '🧁', 'food', true, 3),
('도넛', 'emoji', '🍩', 'food', true, 4),
('쿠키', 'emoji', '🍪', 'food', true, 5),
('커피', 'emoji', '☕', 'food', true, 6),
('차', 'emoji', '🍵', 'food', true, 7),
('아이스크림', 'emoji', '🍦', 'food', true, 8),
('사탕', 'emoji', '🍬', 'food', true, 9),
('초콜릿', 'emoji', '🍫', 'food', true, 10),
('딸기', 'emoji', '🍓', 'food', true, 11),
('복숭아', 'emoji', '🍑', 'food', true, 12);

-- Objects & Symbols
INSERT INTO decoration_items (name, item_type, content, category, is_free, sort_order) VALUES
('책', 'emoji', '📖', 'objects', true, 1),
('연필', 'emoji', '✏️', 'objects', true, 2),
('펜', 'emoji', '🖊️', 'objects', true, 3),
('노트', 'emoji', '📝', 'objects', true, 4),
('편지', 'emoji', '💌', 'objects', true, 5),
('선물', 'emoji', '🎁', 'objects', true, 6),
('리본', 'emoji', '🎀', 'objects', true, 7),
('풍선', 'emoji', '🎈', 'objects', true, 8),
('왕관', 'emoji', '👑', 'objects', true, 9),
('다이아몬드', 'emoji', '💎', 'objects', true, 10),
('음표', 'emoji', '🎵', 'objects', true, 11),
('카메라', 'emoji', '📷', 'objects', true, 12);

-- ============================================
-- DECORATION ITEMS - SVG ICONS (Basic shapes)
-- ============================================
INSERT INTO decoration_items (name, item_type, content, category, is_free, sort_order) VALUES
-- Basic shapes as inline SVG
('원', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>', 'shapes', true, 1),
('하트', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>', 'shapes', true, 2),
('별', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>', 'shapes', true, 3),
('삼각형', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>', 'shapes', true, 4),
('사각형', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>', 'shapes', true, 5),
('다이아몬드', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg>', 'shapes', true, 6),
('육각형', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z"/></svg>', 'shapes', true, 7),
('십자', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6v-2z"/></svg>', 'shapes', true, 8),
-- Decorative elements
('꽃무늬', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="2.5"/><circle cx="17.5" cy="8.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/><circle cx="12" cy="19" r="2.5"/><circle cx="6.5" cy="15.5" r="2.5"/><circle cx="6.5" cy="8.5" r="2.5"/></svg>', 'decorative', true, 10),
('나비', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2 0-4-2-6-2-1.5 0-3 1-4 3s1 6 4 6c2 0 4-2 6-2s4 2 6 2c3 0 5-4 4-6s-2.5-3-4-3c-2 0-4 2-6 2z"/><path d="M12 6v12"/></svg>', 'decorative', true, 11),
('점선원', 'icon', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"><circle cx="12" cy="12" r="9"/></svg>', 'decorative', true, 12),
('물결', 'icon', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0 4 3 6 0"/></svg>', 'decorative', true, 13),
('리본', 'icon', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14l-4-4 2-6h4l2 6-4 4zM4 20l4-6 4 4 4-4 4 6H4z"/></svg>', 'decorative', true, 14);
