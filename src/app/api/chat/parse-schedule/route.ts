import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface CurrentSchedule {
  title: string
  date?: string
  time?: string
  duration?: number
}

interface ParseScheduleRequest {
  text: string
  referenceDate: string  // YYYY-MM-DD (today's date for relative parsing)
  conversationHistory?: string  // Full conversation history for context
  currentSchedule?: CurrentSchedule  // Already parsed schedule info
}

export interface ParsedSchedule {
  title: string
  date: string           // YYYY-MM-DD
  time?: string          // HH:mm
  confidence: number     // 0-1
}

interface ParseScheduleResponse {
  hasSchedule: boolean
  schedules: ParsedSchedule[]
}

function getGeminiClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
}

export async function POST(request: Request): Promise<NextResponse<ParseScheduleResponse>> {
  try {
    const { text, referenceDate, conversationHistory, currentSchedule }: ParseScheduleRequest = await request.json()

    if (!text || !referenceDate) {
      return NextResponse.json({
        hasSchedule: false,
        schedules: [],
      })
    }

    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Build current schedule context
    let currentScheduleContext = ''
    if (currentSchedule) {
      currentScheduleContext = `
현재까지 파악된 일정 정보:
- 제목: ${currentSchedule.title || '미정'}
- 날짜: ${currentSchedule.date || '미정'}
- 시간: ${currentSchedule.time || '미정'}
- 소요시간: ${currentSchedule.duration ? currentSchedule.duration + '분' : '미정'}

중요: 위 정보를 기반으로 사용자의 새 입력에서 추가/수정 정보를 반영하세요.
예: 날짜가 "2024-12-16"으로 이미 정해졌는데 사용자가 "1시로 해줘"라고 하면, 날짜는 유지하고 시간만 "13:00"로 설정하세요.
`
    }

    // Build conversation history context
    let conversationContext = ''
    if (conversationHistory) {
      conversationContext = `
이전 대화 내용:
${conversationHistory}

위 대화를 참고하여 사용자의 의도를 정확히 파악하세요.
`
    }

    const prompt = `당신은 한국어 자연어에서 일정 정보를 추출하는 전문가입니다.

사용자와 대화하며 일정 정보를 수집하고 있습니다. 이전 대화에서 이미 파악된 정보가 있으면 유지하면서 새로운 정보를 추가/수정하세요.

오늘 날짜: ${referenceDate}
${currentScheduleContext}
${conversationContext}

규칙:
1. 이미 파악된 정보(currentSchedule)는 유지하고, 새로운 정보만 업데이트
2. 사용자가 시간만 말하면("1시로 해줘") 기존 날짜는 유지하고 시간만 변경
3. 상대적 날짜를 절대 날짜로 변환:
   - "내일" → 오늘 + 1일
   - "모레" → 오늘 + 2일
   - "다음주 월요일" → 다음 주 월요일 날짜
4. 시간 해석:
   - "1시" 또는 "1시로" → "13:00" (보통 오후로 추정)
   - "오전 10시" → "10:00"
   - "오후 3시" → "15:00"
   - "저녁" → "18:00"
   - "점심" → "12:00"
   - "아침" → "09:00"
5. 일정이 완성되면(제목, 날짜, 시간 모두 있으면) isComplete=true
6. 부족한 정보가 있으면 자연스러운 추가 질문 생성

사용자의 새 입력: "${text}"

반드시 아래 JSON 형식으로만 응답하세요:
{
  "schedules": [
    {
      "title": "일정 제목",
      "date": "YYYY-MM-DD" 또는 null,
      "time": "HH:mm" 또는 null,
      "duration": 분 단위 숫자 또는 null,
      "confidence": 0.9,
      "isComplete": true/false,
      "missingFields": ["date", "time", "duration"] 중 부족한 것들
    }
  ],
  "followUpQuestion": "부족한 정보를 묻는 자연스러운 질문" 또는 null
}

예시:
- 기존: 날짜=2024-12-16 → 입력: "1시로 해줘" → date="2024-12-16", time="13:00"
- 기존: 없음 → 입력: "내일 점심 약속" → date=내일날짜, time="12:00", title="점심 약속"
- 기존: title="점심 약속", date="2024-12-16" → 입력: "아 3시로" → time="15:00" (날짜 유지)`

    const result = await model.generateContent(prompt)
    const response = await result.response
    let responseText = response.text().trim()

    // Clean up the response - remove markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText.slice(7)
    }
    if (responseText.startsWith('```')) {
      responseText = responseText.slice(3)
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.slice(0, -3)
    }
    responseText = responseText.trim()

    try {
      const parsed = JSON.parse(responseText)
      const schedules: ParsedSchedule[] = (parsed.schedules || []).map((s: {
        title: string
        date?: string | null
        time?: string | null
        duration?: number | null
        confidence: number
        isComplete?: boolean
        missingFields?: string[]
      }) => ({
        title: s.title,
        date: s.date || '',
        time: s.time || undefined,
        duration: s.duration || undefined,
        confidence: s.confidence,
        isComplete: s.isComplete ?? false,
        missingFields: s.missingFields || [],
      }))

      return NextResponse.json({
        hasSchedule: schedules.length > 0,
        schedules,
        followUpQuestion: parsed.followUpQuestion || null,
      })
    } catch {
      console.error('Failed to parse AI response:', responseText)
      return NextResponse.json({
        hasSchedule: false,
        schedules: [],
        followUpQuestion: null,
      })
    }
  } catch (error) {
    console.error('Error parsing schedule:', error)
    return NextResponse.json({
      hasSchedule: false,
      schedules: [],
    })
  }
}
