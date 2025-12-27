// AI Prompt Management Types

export interface AIPrompt {
  id: string
  prompt_key: string
  category: AIPromptCategory
  name: string
  description: string | null
  content: string
  variables: string[]
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface AIPromptVersion {
  id: string
  prompt_id: string
  version: number
  content: string
  variables: string[]
  change_summary: string | null
  created_at: string
  created_by: string | null
}

export type AIPromptCategory = 'chat' | 'diary' | 'schedule'

export type AIPromptKey =
  | 'chat.personality'
  | 'chat.greeting'
  | 'chat.closing'
  | 'chat.phase_early'
  | 'chat.phase_mid'
  | 'chat.phase_late'
  | 'chat.schedule_detection'
  | 'chat.response_format'
  | 'diary.write_style'
  | 'diary.metadata_extraction'
  | 'schedule.parsing'

export const AI_PROMPT_CATEGORIES: Record<AIPromptCategory, string> = {
  chat: '대화',
  diary: '일기',
  schedule: '일정',
}

export const AI_PROMPT_CATEGORY_LIST: { value: AIPromptCategory; label: string }[] = [
  { value: 'chat', label: '대화' },
  { value: 'diary', label: '일기' },
  { value: 'schedule', label: '일정' },
]

// Default/fallback prompts (used when DB is unavailable)
export const DEFAULT_PROMPTS: Record<AIPromptKey, string> = {
  'chat.personality': `당신은 따뜻하고 공감 능력이 뛰어난 친구 같은 AI입니다.
사용자의 하루를 자연스럽게 들으면서 일기 작성을 위한 정보를 모읍니다.

중요 지침:
1. 먼저 사용자가 방금 말한 내용에 대해 짧게 공감하거나 반응해주세요
2. 그 다음 자연스럽게 이어지는 질문을 해주세요
3. 마치 친한 친구와 대화하듯 편안하고 자연스럽게 대화하세요
4. 너무 형식적이거나 딱딱하지 않게, 구어체로 말하세요
5. 이모지나 특수문자는 사용하지 마세요 (음성으로 읽힙니다)`,

  'chat.greeting': '안녕하세요! 오늘 하루는 어떠셨나요? 편하게 이야기해 주세요.',

  'chat.closing': '오늘 이야기 나눠주셔서 감사해요. 이제 말씀해주신 내용을 바탕으로 오늘의 일기를 작성해 드릴게요.',

  'chat.phase_early': '초반 대화: 사용자의 하루 전반적인 기분과 주요 일과를 파악하세요.',

  'chat.phase_mid': '중반 대화: 사용자가 언급한 내용 중 흥미로운 부분을 더 깊이 탐색하세요. 감정이나 구체적인 상황을 물어보세요.',

  'chat.phase_late': '후반 대화: 감사했던 점, 내일 계획, 또는 오늘의 교훈 등 하루를 마무리하는 질문을 하세요.',

  'chat.schedule_detection': `일정 감지 및 추가 질문 지침:
- **미래 일정만** 감지하세요! 과거에 있었던 일은 일정이 아닙니다.
- 미래 일정 예시 (감지해야 함): "내일 3시에 회의 있어", "다음주 월요일 점심 약속"
- 과거 사건 예시 (감지하면 안됨): "오늘 1시간 미팅했어", "아까 3시에 회의했어"
- 오늘 날짜: {{today}}
- 상대적 날짜를 절대 날짜(YYYY-MM-DD)로 변환하세요`,

  'chat.response_format': `응답 형식 (반드시 JSON으로):
{
  "question": "공감 + 질문 내용 (2-3문장, 이모지 없이)",
  "detectedSchedules": [],
  "updatedPendingSchedule": null
}`,

  'diary.write_style': `대화 내용을 바탕으로 1인칭 일기를 작성해주세요.
- 첫 줄에 "{{dateInfo}}" 표시
- 편안한 구어체, 2-3문단
- 감정과 생각을 자연스럽게 표현
일기 본문만 작성하세요.`,

  'diary.metadata_extraction': `다음 일기를 분석해서 JSON으로 응답하세요:
{"summary":"한줄요약","emotions":["감정태그"],"gratitude":["감사한점"],"tomorrow_plan":"내일다짐"}`,

  'schedule.parsing': `당신은 캘린더 일정 수집 어시스턴트입니다.
사용자와 대화하며 일정 정보를 단계별로 수집합니다.`,
}
