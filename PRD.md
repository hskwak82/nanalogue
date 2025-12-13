# Nanalogue (나날로그) - Product Requirements Document

> AI 대화형 일기 + 일정 회고 + 요약/일기 생성 서비스

---

## 1. 제품 개요

### 1.1 비전
매일 AI와의 자연스러운 대화를 통해 하루를 기록하고, 감정을 정리하며, 일정을 회고하는 개인화된 일기 서비스

### 1.2 핵심 가치
- **대화형 기록**: 텍스트/음성으로 AI와 대화하며 자연스럽게 하루 기록
- **일정 회고**: Google Calendar 연동으로 완료/미완료 일정 자동 회고
- **개인화**: 관심사(스포츠, 뉴스 등) 기반 맞춤 질문
- **AI 일기 생성**: 대화 내용을 바탕으로 일기/요약 자동 생성

### 1.3 타겟 사용자
- 일기를 쓰고 싶지만 시작이 어려운 사람
- 하루를 정리하고 회고하고 싶은 직장인
- 감정 기록과 자기 성찰에 관심 있는 사용자

---

## 2. 기술 스택

### 2.1 Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context + Server Components

### 2.2 Backend
- **BaaS**: Supabase
  - PostgreSQL Database
  - Authentication (Email + Google OAuth)
  - Storage (음성 파일)
  - Edge Functions (필요시)

### 2.3 AI/ML Services
- **LLM**: OpenAI GPT-4 / Claude API
- **STT**: OpenAI Whisper API
- **TTS**: OpenAI TTS / Amazon Polly

### 2.4 Deployment
- **Hosting**: Vercel
- **Domain**: TBD

---

## 3. 데이터베이스 스키마

### 3.1 profiles
사용자 프로필 정보
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  locale TEXT DEFAULT 'ko-KR',
  timezone TEXT DEFAULT 'Asia/Seoul',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 user_preferences
사용자 선호 설정
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  interests JSONB DEFAULT '[]', -- ["sports", "news", "tech"]
  tone TEXT DEFAULT 'friendly', -- friendly, formal, casual
  language TEXT DEFAULT 'ko',
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 3.3 daily_sessions
일일 대화 세션
```sql
CREATE TABLE daily_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  status TEXT DEFAULT 'active', -- active, completed, abandoned
  raw_conversation JSONB DEFAULT '[]',
  calendar_events JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_date)
);
```

### 3.4 diary_entries
생성된 일기
```sql
CREATE TABLE diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES daily_sessions(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  content TEXT NOT NULL, -- 일기 본문
  summary TEXT, -- 하루 요약
  emotions JSONB DEFAULT '[]', -- ["happy", "tired"]
  gratitude JSONB DEFAULT '[]', -- 감사 포인트
  schedule_review JSONB DEFAULT '{}', -- 일정 회고
  tomorrow_plan TEXT, -- 내일 계획
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);
```

### 3.5 calendar_tokens (선택)
Google Calendar OAuth 토큰
```sql
CREATE TABLE calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT DEFAULT 'google',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

### 3.6 subscriptions (유료화)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free', -- free, pro
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active', -- active, canceled, past_due
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

---

## 4. 핵심 기능 명세

### 4.1 인증 (Authentication)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 이메일 로그인 | 이메일/비밀번호 로그인 | P0 |
| Google OAuth | 구글 계정 로그인 | P0 |
| 프로필 관리 | 이름, 설정 변경 | P1 |
| 로그아웃 | 세션 종료 | P0 |

### 4.2 대화 세션 (Conversation Session)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 텍스트 대화 | 텍스트 입력으로 AI와 대화 | P0 |
| 음성 입력 | 마이크로 음성 녹음 → STT | P1 |
| AI 질문 생성 | 맥락에 맞는 후속 질문 | P0 |
| 세션 저장 | 대화 내용 실시간 저장 | P0 |
| 세션 종료 | 5-7개 질문 후 종료 옵션 | P0 |

### 4.3 AI 질문 흐름
```
1. 인사 + 오늘 기분 질문
2. 오늘 가장 기억에 남는 일
3. (캘린더 연동 시) 일정 회고 질문
4. (관심사 기반) 개인화 질문
5. 감사한 점 질문
6. 내일 계획/기대
7. 마무리 + 일기 생성
```

### 4.4 일기 생성 (Diary Generation)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 일기 본문 생성 | 대화 기반 문단형 일기 | P0 |
| 감정 요약 | 오늘의 감정 태그 | P0 |
| 감사 포인트 | 감사한 점 정리 | P1 |
| 일정 회고 | 완료/미완료/이월 정리 | P1 |
| 내일 계획 | 다음날 계획 정리 | P1 |

### 4.5 캘린더 연동 (Calendar Integration)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| Google OAuth | 캘린더 읽기 권한 | P1 |
| 오늘 일정 조회 | 당일 일정 목록 | P1 |
| 일정 기반 질문 | "A 미팅은 어땠나요?" | P1 |
| 일정 업데이트 | 이월/취소 반영 (선택) | P2 |

### 4.6 음성 기능 (Voice Features)
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 녹음 UI | 시작/중지/타이머 | P1 |
| STT | 음성 → 텍스트 변환 | P1 |
| TTS | AI 질문 음성 재생 | P2 |
| 자동 재생 | 질문 도착 시 자동 재생 옵션 | P2 |

---

## 5. API 엔드포인트

### 5.1 인증
```
POST /api/auth/login        - 이메일 로그인
POST /api/auth/signup       - 회원가입
POST /api/auth/logout       - 로그아웃
GET  /api/auth/session      - 세션 확인
```

### 5.2 대화 세션
```
POST /api/session/start     - 새 세션 시작
GET  /api/session/current   - 현재 세션 조회
POST /api/session/message   - 메시지 전송 + AI 응답
POST /api/session/complete  - 세션 완료
```

### 5.3 AI
```
POST /api/chat/next-question  - 다음 질문 생성
POST /api/diary/generate      - 일기 생성
```

### 5.4 음성
```
POST /api/audio/upload      - 음성 파일 업로드
POST /api/stt/transcribe    - 음성 → 텍스트
POST /api/tts/synthesize    - 텍스트 → 음성
```

### 5.5 캘린더
```
GET  /api/calendar/auth     - OAuth 시작
GET  /api/calendar/callback - OAuth 콜백
GET  /api/calendar/events   - 오늘 일정 조회
```

### 5.6 일기
```
GET  /api/diary/:date       - 특정 날짜 일기 조회
GET  /api/diary/list        - 일기 목록 조회
PUT  /api/diary/:id         - 일기 수정
```

---

## 6. 페이지 구조

```
/                     - 랜딩 페이지 (비로그인)
/login                - 로그인 페이지
/signup               - 회원가입 페이지

/dashboard            - 메인 대시보드 (로그인 후)
/session              - 대화 세션 페이지
/session/[date]       - 특정 날짜 세션

/diary                - 일기 목록
/diary/[date]         - 일기 상세

/settings             - 설정
/settings/profile     - 프로필 설정
/settings/preferences - 선호 설정
/settings/calendar    - 캘린더 연동
/settings/subscription - 구독 관리
```

---

## 7. UI/UX 가이드라인

### 7.1 디자인 원칙
- **따뜻함**: 부드러운 색상, 둥근 모서리
- **단순함**: 핵심 기능에 집중, 복잡한 UI 지양
- **대화 중심**: 채팅 UI가 메인, 편안한 대화 경험

### 7.2 색상 팔레트
```
Primary: #6366F1 (Indigo)
Secondary: #F59E0B (Amber)
Background: #FAFAFA (Light) / #1F2937 (Dark)
Text: #1F2937 (Light) / #F9FAFB (Dark)
Success: #10B981
Error: #EF4444
```

### 7.3 반응형
- Mobile First
- Breakpoints: sm(640px), md(768px), lg(1024px)

---

## 8. MVP 개발 우선순위

### Phase 1: Core (Week 1-2)
1. [x] 프로젝트 설정 (Next.js, Supabase)
2. [ ] 인증 (이메일 + Google)
3. [ ] 기본 UI (레이아웃, 네비게이션)
4. [ ] 텍스트 대화 세션
5. [ ] AI 질문 생성
6. [ ] 일기 생성 및 저장

### Phase 2: Voice (Week 3)
1. [ ] 마이크 녹음 UI
2. [ ] STT 연동
3. [ ] TTS 연동 (선택)

### Phase 3: Calendar (Week 4)
1. [ ] Google Calendar OAuth
2. [ ] 일정 조회
3. [ ] 일정 기반 질문

### Phase 4: Polish (Week 5)
1. [ ] 관심사 개인화
2. [ ] 리포트 (주간/월간)
3. [ ] 유료화 (Stripe)

---

## 9. 보안 요구사항

### 9.1 데이터 보안
- 모든 API HTTPS 필수
- Supabase RLS로 사용자별 데이터 격리
- OAuth 토큰 암호화 저장
- 민감 데이터 로깅 금지

### 9.2 인증 보안
- JWT 기반 세션 관리
- Refresh Token 로테이션
- CORS 설정 (허용 도메인만)

### 9.3 API 보안
- Rate Limiting
- Input Validation
- SQL Injection 방지 (Supabase 자동)

---

## 10. 성능 요구사항

### 10.1 응답 시간
- 페이지 로드: < 2초
- API 응답: < 500ms (AI 제외)
- AI 응답: < 5초

### 10.2 가용성
- Uptime: 99.5%
- 에러율: < 1%

### 10.3 확장성
- 동시 사용자: 1,000명 (MVP)
- 일일 세션: 10,000건 (MVP)

---

## 11. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Google OAuth (Calendar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe (유료화)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 12. 참고 자료

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Changelog

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 0.1.0 | 2024-12-13 | 초기 PRD 작성 |
