-- Premium Cover Templates Migration
-- Created: 2024-12-17
-- 20 Premium diary cover templates with beautiful images

-- ============================================
-- PREMIUM COVER TEMPLATES
-- ============================================
INSERT INTO cover_templates (name, description, image_url, category, is_free, sort_order) VALUES

-- Texture & Material (leather, fabric, paper)
('벨벳 버건디', '고급스러운 버건디 벨벳 질감', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=600&fit=crop', 'texture', false, 101),
('네이비 레더', '클래식한 네이비 가죽 질감', 'https://images.unsplash.com/photo-1531685250784-7569952593d2?w=400&h=600&fit=crop', 'texture', false, 102),
('린넨 베이지', '따뜻한 린넨 패브릭 느낌', 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&h=600&fit=crop', 'texture', false, 103),
('빈티지 페이퍼', '오래된 종이 질감의 빈티지 스타일', 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=400&h=600&fit=crop', 'texture', false, 104),

-- Marble & Stone
('화이트 마블', '우아한 흰색 대리석 패턴', 'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=400&h=600&fit=crop', 'marble', false, 111),
('핑크 마블', '로맨틱한 핑크 대리석 패턴', 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=600&fit=crop', 'marble', false, 112),
('다크 마블', '시크한 다크 대리석 패턴', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop', 'marble', false, 113),

-- Nature & Botanical
('블루밍 로즈', '화사한 장미꽃 패턴', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=600&fit=crop', 'botanical', false, 121),
('트로피컬 리프', '싱그러운 열대 나뭇잎', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=600&fit=crop', 'botanical', false, 122),
('체리블라썸', '은은한 벚꽃 일러스트', 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&h=600&fit=crop', 'botanical', false, 123),
('와일드플라워', '들꽃이 수놓인 패턴', 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=600&fit=crop', 'botanical', false, 124),
('유칼립투스', '차분한 유칼립투스 잎', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=600&fit=crop&q=80', 'botanical', false, 125),

-- Artistic & Abstract
('골드 브러시', '금색 붓터치 아트웍', 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=600&fit=crop', 'artistic', false, 131),
('수채화 블루', '부드러운 파란 수채화', 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=600&fit=crop', 'artistic', false, 132),
('테라코타 웨이브', '따뜻한 테라코타 물결', 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=600&fit=crop&sat=-50&hue=30', 'artistic', false, 133),
('오로라', '몽환적인 오로라 그라데이션', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=600&fit=crop', 'artistic', false, 134),

-- Minimal & Modern
('모던 블랙', '세련된 블랙 미니멀', 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400&h=600&fit=crop', 'minimal', false, 141),
('소프트 그레이디언트', '부드러운 그레이 그라데이션', 'https://images.unsplash.com/photo-1557682260-96773eb01377?w=400&h=600&fit=crop', 'minimal', false, 142),

-- Night & Galaxy
('스타리 나잇', '별이 빛나는 밤하늘', 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=600&fit=crop', 'galaxy', false, 151),
('갤럭시 드림', '신비로운 은하수', 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=600&fit=crop', 'galaxy', false, 152);
