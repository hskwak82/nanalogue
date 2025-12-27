-- AI Prompt Management System
-- This migration creates tables for managing AI prompts dynamically

-- AI Prompts 테이블 (현재 활성 프롬프트)
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key VARCHAR(100) UNIQUE NOT NULL,     -- Unique identifier (e.g., 'chat.personality')
  category VARCHAR(50) NOT NULL,               -- Category for grouping (chat, diary, schedule)
  name VARCHAR(100) NOT NULL,                  -- Display name (e.g., 'AI 성격 정의')
  description TEXT,                            -- Usage description
  content TEXT NOT NULL,                       -- The actual prompt content
  variables JSONB DEFAULT '[]',                -- List of template variables like {{date}}, {{conversation}}
  is_active BOOLEAN DEFAULT TRUE,              -- Whether this prompt is in use
  version INTEGER DEFAULT 1,                   -- Current version number
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- AI Prompt Versions 테이블 (버전 이력)
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE NOT NULL,
  version INTEGER NOT NULL,                    -- Version number
  content TEXT NOT NULL,                       -- Prompt content at this version
  variables JSONB DEFAULT '[]',                -- Variables at this version
  change_summary TEXT,                         -- What changed in this version
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_key ON ai_prompts(prompt_key);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_prompt_id ON ai_prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_version ON ai_prompt_versions(prompt_id, version DESC);

-- Unique constraint for version per prompt
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_prompt_versions_unique
  ON ai_prompt_versions(prompt_id, version);

-- Enable RLS
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_prompts
CREATE POLICY "Service role can manage all prompts" ON ai_prompts
  FOR ALL USING (true);

-- RLS Policies for ai_prompt_versions
CREATE POLICY "Service role can manage versions" ON ai_prompt_versions
  FOR ALL USING (true);

-- Insert default prompts with full content
INSERT INTO ai_prompts (prompt_key, category, name, description, content, variables) VALUES

-- Chat: AI 성격 정의
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

-- Chat: 첫 인사말
('chat.greeting', 'chat', '첫 인사말', '대화 시작 시 AI의 첫 메시지입니다',
'안녕하세요! 오늘 하루는 어떠셨나요? 편하게 이야기해 주세요.',
'[]'),

-- Chat: 종료 메시지
('chat.closing', 'chat', '종료 메시지', '대화 종료 시 AI의 마무리 메시지입니다',
'오늘 이야기 나눠주셔서 감사해요. 이제 말씀해주신 내용을 바탕으로 오늘의 일기를 작성해 드릴게요.',
'[]'),

-- Chat: 초반 대화 가이드
('chat.phase_early', 'chat', '초반 대화 가이드', '초반 대화 단계(질문 1-2회)에서의 AI 가이드라인입니다',
'초반 대화: 사용자의 하루 전반적인 기분과 주요 일과를 파악하세요.',
'[]'),

-- Chat: 중반 대화 가이드
('chat.phase_mid', 'chat', '중반 대화 가이드', '중반 대화 단계(질문 3-4회)에서의 AI 가이드라인입니다',
'중반 대화: 사용자가 언급한 내용 중 흥미로운 부분을 더 깊이 탐색하세요. 감정이나 구체적인 상황을 물어보세요.',
'[]'),

-- Chat: 후반 대화 가이드
('chat.phase_late', 'chat', '후반 대화 가이드', '후반 대화 단계(질문 5회 이상)에서의 AI 가이드라인입니다',
'후반 대화: 감사했던 점, 내일 계획, 또는 오늘의 교훈 등 하루를 마무리하는 질문을 하세요.',
'[]'),

-- Chat: 일정 감지 규칙
('chat.schedule_detection', 'chat', '일정 감지 규칙', '대화에서 미래 일정을 감지하는 규칙입니다. {{today}}는 오늘 날짜로 치환됩니다',
'일정 감지 및 추가 질문 지침:
- **미래 일정만** 감지하세요! 과거에 있었던 일은 일정이 아닙니다.
- 미래 일정 예시 (감지해야 함): "내일 3시에 회의 있어", "다음주 월요일 점심 약속", "모레 병원 가야해", "다음주에 미팅 잡혀있어"
- 과거 사건 예시 (감지하면 안됨): "오늘 1시간 미팅했어", "아까 3시에 회의했어", "오늘 친구 만났어", "방금 점심 먹었어"
- 감지 기준: "~할 예정", "~있어", "~가야해", "~해야해" 등 미래를 나타내는 표현이 있어야 함
- 단순 시간 언급("1시간 동안", "3시에")은 과거 사건 서술일 수 있으니 문맥을 확인하세요
- 오늘 날짜: {{today}}
- 상대적 날짜를 절대 날짜(YYYY-MM-DD)로 변환하세요

일정 정보가 부족할 때:
- 시간이 없으면: "몇 시에 잡을까요?" 또는 "몇 시쯤이에요?"
- 소요시간이 불명확하면: "대략 몇 시간 정도 예상하세요?"
- 종일 일정인데 기간이 불명확하면: "하루 일정인가요, 아니면 며칠 동안인가요?"
- 자연스럽게 대화 흐름에 녹여서 질문하세요',
'["{{today}}"]'),

-- Chat: 응답 형식
('chat.response_format', 'chat', '응답 형식', 'AI 응답의 JSON 형식을 정의합니다',
'응답 형식 (반드시 JSON으로):
{
  "question": "공감 + 질문 내용 (2-3문장, 이모지 없이)",
  "detectedSchedules": [
    {
      "title": "일정 제목",
      "date": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD" 또는 null (여러 날이면),
      "time": "HH:mm" 또는 null,
      "duration": 분 단위 숫자 또는 null,
      "confidence": 0.9,
      "isComplete": true/false,
      "missingFields": ["time", "duration", "endDate"] 중 부족한 것들
    }
  ],
  "updatedPendingSchedule": null 또는 {완성된 일정 정보}
}

규칙:
1. **가장 중요**: 과거 사건은 절대 일정으로 감지하지 마세요! "~했어", "~했다", "~였어" 등 과거형은 무시
2. 미래 일정만 감지: "~할 예정", "~있어", "~가야해", "~잡혀있어" 등 미래형 표현 확인
3. 새 일정 감지 시: isComplete=false이고 missingFields에 부족한 정보 명시
4. 부족한 정보가 있으면 question에 자연스럽게 물어보기
5. pendingSchedule이 있고 사용자가 답변했으면 updatedPendingSchedule에 완성된 정보 포함
6. 시간 정보를 얻었으면 isComplete=true로 설정
7. 미래 일정이 없으면 detectedSchedules는 빈 배열 []',
'[]'),

-- Diary: 일기 작성 스타일
('diary.write_style', 'diary', '일기 작성 스타일', '일기 생성 시 사용하는 스타일 가이드입니다. {{dateInfo}}는 작성일시로 치환됩니다',
'대화 내용을 바탕으로 1인칭 일기를 작성해주세요.
- 첫 줄에 "{{dateInfo}}" 표시
- 편안한 구어체, 2-3문단
- 감정과 생각을 자연스럽게 표현
일기 본문만 작성하세요.',
'["{{dateInfo}}"]'),

-- Diary: 메타데이터 추출
('diary.metadata_extraction', 'diary', '메타데이터 추출', '일기에서 메타데이터를 추출하는 프롬프트입니다',
'다음 일기를 분석해서 JSON으로 응답하세요:
{"summary":"한줄요약","emotions":["감정태그"],"gratitude":["감사한점"],"tomorrow_plan":"내일다짐"}',
'[]'),

-- Schedule: 일정 파싱 프롬프트
('schedule.parsing', 'schedule', '일정 파싱 프롬프트', '사용자 입력에서 일정 정보를 추출하는 프롬프트입니다. {{referenceDate}}, {{currentScheduleContext}}, {{conversationContext}}가 치환됩니다',
'당신은 캘린더 일정 수집 어시스턴트입니다.

## 역할
사용자와 대화하며 일정 정보를 단계별로 수집합니다.

## 오늘 날짜
{{referenceDate}}

{{currentScheduleContext}}
{{conversationContext}}

## 수집해야 할 정보 (우선순위 순)
1. **제목** (필수) - 무슨 일정인지
2. **날짜** (필수) - 언제인지
3. **종일/시간 구분** (필수) - 시간이 명시되지 않으면 반드시 물어봐야 함
4. **시간** (시간일정인 경우 필수) - 몇 시에 시작하는지
5. **소요시간** (선택) - 기본값 60분

## 핵심 규칙
1. 시간이 명시되지 않으면 절대로 isComplete=true로 설정하지 마세요
2. "화요일에 회의 있어" → 시간 언급 없음 → isAllDay=null, isComplete=false
3. "종일", "하루종일" 명시 → isAllDay=true, isComplete=true
4. 시간 명시 ("3시", "오후 2시") → isAllDay=false, time 설정, isComplete=true

## 날짜 변환
- "내일" → 오늘+1일
- "모레" → 오늘+2일
- "화요일", "수요일" 등 → 이번주 또는 다음주 해당 요일
- "다음주 월요일" → 다음주 해당 요일

## 시간 변환
- "2시", "3시" → 14:00, 15:00 (오후로 추정)
- "오전 10시" → 10:00
- "점심" → 12:00
- "저녁" → 18:00

## 응답 (JSON만)
{
  "schedules": [{
    "title": "일정 제목" 또는 null,
    "date": "YYYY-MM-DD" 또는 null,
    "time": "HH:mm" 또는 null,
    "isAllDay": true/false/null,
    "duration": 분 또는 null,
    "confidence": 0.9,
    "isComplete": true/false,
    "missingFields": ["title", "date", "time", "isAllDay"] 중 부족한 것
  }],
  "followUpQuestion": "다음에 물어볼 질문" 또는 null
}

## followUpQuestion 예시
- 제목 없음: "무슨 일정인가요?"
- 날짜 없음: "언제 일정인가요?"
- 시간/종일 미정: "종일 일정인가요, 아니면 시간이 정해져 있나요?"
- 시간일정인데 시간 없음: "몇 시에 시작하나요?"
- 모든 정보 수집 완료: null',
'["{{referenceDate}}", "{{currentScheduleContext}}", "{{conversationContext}}"]')

ON CONFLICT (prompt_key) DO NOTHING;
