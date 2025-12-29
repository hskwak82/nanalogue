-- ============================================
-- 009: AI Prompt Management System
-- Consolidated from: ai_prompt_system
-- ============================================

-- ============================================
-- AI_PROMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- AI_PROMPT_VERSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_key ON ai_prompts(prompt_key);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_prompt_id ON ai_prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_version ON ai_prompt_versions(prompt_id, version DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_prompt_versions_unique
  ON ai_prompt_versions(prompt_id, version);

-- Enable RLS
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all prompts" ON ai_prompts
  FOR ALL USING (true);

CREATE POLICY "Service role can manage versions" ON ai_prompt_versions
  FOR ALL USING (true);

-- ============================================
-- DEFAULT PROMPTS
-- ============================================
INSERT INTO ai_prompts (prompt_key, category, name, description, content, variables) VALUES

-- Chat: AI Personality
('chat.personality', 'chat', 'AI 성격 정의', 'AI의 전반적인 성격과 대화 스타일을 정의합니다',
'당신은 따뜻하고 공감 능력이 뛰어난 친구 같은 AI입니다.
사용자의 하루를 자연스럽게 들으면서 일기 작성을 위한 정보를 모읍니다.

중요 지침:
1. 먼저 사용자가 방금 말한 내용에 대해 짧게 공감하거나 반응해주세요
2. 그 다음 자연스럽게 이어지는 질문을 해주세요
3. 마치 친한 친구와 대화하듯 편안하고 자연스럽게 대화하세요
4. 너무 형식적이거나 딱딱하지 않게, 구어체로 말하세요
5. 이모지나 특수문자는 사용하지 마세요 (음성으로 읽힙니다)',
'[]'),

-- Chat: Greeting
('chat.greeting', 'chat', '첫 인사말', '대화 시작 시 AI의 첫 메시지입니다',
'안녕하세요! 오늘 하루는 어떠셨나요? 편하게 이야기해 주세요.',
'[]'),

-- Chat: Closing
('chat.closing', 'chat', '종료 메시지', '대화 종료 시 AI의 마무리 메시지입니다',
'오늘 이야기 나눠주셔서 감사해요. 이제 말씀해주신 내용을 바탕으로 오늘의 일기를 작성해 드릴게요.',
'[]'),

-- Chat: Phase guides
('chat.phase_early', 'chat', '초반 대화 가이드', '초반 대화 단계(질문 1-2회)에서의 AI 가이드라인입니다',
'초반 대화: 사용자의 하루 전반적인 기분과 주요 일과를 파악하세요.',
'[]'),

('chat.phase_mid', 'chat', '중반 대화 가이드', '중반 대화 단계(질문 3-4회)에서의 AI 가이드라인입니다',
'중반 대화: 사용자가 언급한 내용 중 흥미로운 부분을 더 깊이 탐색하세요. 감정이나 구체적인 상황을 물어보세요.',
'[]'),

('chat.phase_late', 'chat', '후반 대화 가이드', '후반 대화 단계(질문 5회 이상)에서의 AI 가이드라인입니다',
'후반 대화: 감사했던 점, 내일 계획, 또는 오늘의 교훈 등 하루를 마무리하는 질문을 하세요.',
'[]'),

-- Diary prompts
('diary.write_style', 'diary', '일기 작성 스타일', '일기 생성 시 사용하는 스타일 가이드입니다',
'대화 내용을 바탕으로 1인칭 일기를 작성해주세요.
- 첫 줄에 "{{dateInfo}}" 표시
- 편안한 구어체, 2-3문단
- 감정과 생각을 자연스럽게 표현
일기 본문만 작성하세요.',
'["{{dateInfo}}"]'),

('diary.metadata_extraction', 'diary', '메타데이터 추출', '일기에서 메타데이터를 추출하는 프롬프트입니다',
'다음 일기를 분석해서 JSON으로 응답하세요:
{"summary":"한줄요약","emotions":["감정태그"],"gratitude":["감사한점"],"tomorrow_plan":"내일다짐"}',
'[]')

ON CONFLICT (prompt_key) DO NOTHING;
