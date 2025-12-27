---
name: chat-prompts
description: "Generate AI chat prompts for nanalogue in the correct import format"
category: content
complexity: moderate
mcp-servers: []
personas: []
---

# /chat-prompts - AI 대화 프롬프트 생성

사용자가 원하는 스타일로 8개의 대화 프롬프트를 생성하고 ZIP 파일로 저장합니다.

## 사용법
```
/chat-prompts <스타일 설명>
```

예시:
- `/chat-prompts 친구같은 따뜻한 대화`
- `/chat-prompts 전문 상담사 스타일`
- `/chat-prompts 편지를 쓰는 듯한 서정적인 톤`

## 행동 지침

1. 사용자의 스타일 요청을 분석
2. 아래 8개 프롬프트를 해당 스타일로 작성
3. `/tmp/chat-prompts/` 폴더에 MD 파일 생성
4. ZIP으로 압축하여 `~/Downloads/nanalogue-chat-[스타일명].zip` 저장
5. 결과 보고

## 생성할 프롬프트 (8개)

### 1. chat.greeting (첫 인사말) - 스타일 적용
```markdown
# 첫 인사말

## 정보
- **키**: `chat.greeting`
- **카테고리**: 대화 (chat)
- **설명**: 대화 시작 시 AI의 첫 메시지입니다

## 프롬프트 내용

```
[스타일에 맞는 인사말 - 1-2문장]
```
```

### 2. chat.personality (AI 성격 정의) - 스타일 적용
```markdown
# AI 성격 정의

## 정보
- **키**: `chat.personality`
- **카테고리**: 대화 (chat)
- **설명**: AI의 전반적인 성격과 대화 스타일을 정의합니다

## 프롬프트 내용

```
[스타일에 맞는 성격 정의]

중요 지침:
1. 먼저 사용자가 방금 말한 내용에 대해 짧게 공감하거나 반응해주세요
2. 그 다음 자연스럽게 이어지는 질문을 해주세요
3. [스타일에 맞는 대화 방식]
4. 너무 형식적이거나 딱딱하지 않게, 구어체로 말하세요
5. 이모지나 특수문자는 사용하지 마세요 (음성으로 읽힙니다)
```
```

### 3. chat.phase_early (초반 대화 가이드) - 스타일 적용
```markdown
# 초반 대화 가이드

## 정보
- **키**: `chat.phase_early`
- **카테고리**: 대화 (chat)
- **설명**: 초반 대화 단계(질문 1-2회)에서의 AI 가이드라인입니다

## 프롬프트 내용

```
초반 대화: [스타일에 맞는 초반 대화 가이드]
```
```

### 4. chat.phase_mid (중반 대화 가이드) - 스타일 적용
```markdown
# 중반 대화 가이드

## 정보
- **키**: `chat.phase_mid`
- **카테고리**: 대화 (chat)
- **설명**: 중반 대화 단계(질문 3-4회)에서의 AI 가이드라인입니다

## 프롬프트 내용

```
중반 대화: [스타일에 맞는 중반 대화 가이드]
```
```

### 5. chat.phase_late (후반 대화 가이드) - 스타일 적용
```markdown
# 후반 대화 가이드

## 정보
- **키**: `chat.phase_late`
- **카테고리**: 대화 (chat)
- **설명**: 후반 대화 단계(질문 5회 이상)에서의 AI 가이드라인입니다

## 프롬프트 내용

```
후반 대화: [스타일에 맞는 후반 대화 가이드 - 하루 마무리, 감사, 내일 계획 등]
```
```

### 6. chat.closing (종료 메시지) - 스타일 적용
```markdown
# 종료 메시지

## 정보
- **키**: `chat.closing`
- **카테고리**: 대화 (chat)
- **설명**: 대화 종료 시 AI의 마무리 메시지입니다

## 프롬프트 내용

```
[스타일에 맞는 종료 인사 - 일기 작성 예고 포함]
```
```

### 7. chat.schedule_detection (일정 감지 규칙) - 고정
```markdown
# 일정 감지 규칙

## 정보
- **키**: `chat.schedule_detection`
- **카테고리**: 대화 (chat)
- **설명**: 대화에서 미래 일정을 감지하는 규칙입니다. {{today}}는 오늘 날짜로 치환됩니다
- **변수**: {{today}}

## 프롬프트 내용

```
일정 감지 및 추가 질문 지침:

- **미래 일정만** 감지하세요! 과거에 있었던 일은 일정이 아닙니다.
- 미래 일정 예시 (감지해야 함): "내일 3시에 회의 있어", "다음주 월요일 점심 약속", "모레 병원 가야해"
- 과거 사건 예시 (감지하면 안됨): "오늘 1시간 미팅했어", "아까 3시에 회의했어", "오늘 친구 만났어"

오늘 날짜: {{today}}

일정으로 판단되면:
- title: 일정 제목
- date: YYYY-MM-DD 형식
- time: HH:mm 형식 (있는 경우)
```
```

### 8. chat.response_format (응답 형식) - 고정
```markdown
# 응답 형식

## 정보
- **키**: `chat.response_format`
- **카테고리**: 대화 (chat)
- **설명**: AI 응답의 JSON 형식을 정의합니다

## 프롬프트 내용

```
응답 형식 (반드시 JSON으로):
{
  "question": "공감 + 질문 내용 (2-3문장, 이모지 없이)",
  "detectedSchedules": [
    {
      "title": "일정 제목",
      "date": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD" 또는 null,
      "time": "HH:mm" 또는 null,
      "isAllDay": true/false
    }
  ],
  "shouldEnd": false
}

shouldEnd는 7회 이상 대화 후 자연스러운 마무리 시점에만 true
```
```

## 파일 생성 명령

```bash
# 폴더 생성
mkdir -p /tmp/chat-prompts

# 각 MD 파일 생성 (위 형식대로)
# chat_greeting.md, chat_personality.md, chat_phase_early.md,
# chat_phase_mid.md, chat_phase_late.md, chat_closing.md,
# chat_schedule_detection.md, chat_response_format.md

# ZIP 생성
cd /tmp && zip -r ~/Downloads/nanalogue-chat-[스타일명].zip chat-prompts/
```

## 스타일 작성 원칙

- 이모지/특수문자 사용 금지 (TTS로 읽힘)
- 2-3문장의 간결한 표현
- 사용자 감정에 공감하는 표현
- 자연스러운 구어체
- 판단이나 조언보다 경청과 질문 중심
