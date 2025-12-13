import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface CurrentSchedule {
  title?: string
  date?: string
  time?: string
  duration?: number
  isAllDay?: boolean
}

interface ParseScheduleRequest {
  text: string
  referenceDate: string
  conversationHistory?: string
  currentSchedule?: CurrentSchedule
}

interface ParsedScheduleResponse {
  title: string
  date: string
  time?: string
  duration?: number
  isAllDay?: boolean
  confidence: number
  isComplete: boolean
  missingFields: string[]
}

interface ApiResponse {
  hasSchedule: boolean
  schedules: ParsedScheduleResponse[]
  followUpQuestion?: string | null
}

function getGeminiClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
}

export async function POST(request: Request): Promise<NextResponse<ApiResponse>> {
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
    if (currentSchedule && (currentSchedule.title || currentSchedule.date)) {
      currentScheduleContext = `
현재까지 파악된 일정 정보:
- 제목: ${currentSchedule.title || '미정'}
- 날짜: ${currentSchedule.date || '미정'}
- 시간: ${currentSchedule.time || '미정'}
- 종일여부: ${currentSchedule.isAllDay === true ? '종일' : currentSchedule.isAllDay === false ? '시간일정' : '미정'}
- 소요시간: ${currentSchedule.duration ? currentSchedule.duration + '분' : '미정'}

중요: 기존 정보를 유지하면서 새로운 정보만 업데이트하세요.
`
    }

    // Build conversation history context
    let conversationContext = ''
    if (conversationHistory) {
      conversationContext = `
이전 대화:
${conversationHistory}
`
    }

    const prompt = `당신은 캘린더 일정 수집 어시스턴트입니다.

## 역할
사용자와 대화하며 일정 정보를 단계별로 수집합니다.

## 오늘 날짜
${referenceDate}

${currentScheduleContext}
${conversationContext}

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

## 사용자 입력
"${text}"

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
- 모든 정보 수집 완료: null`

    const result = await model.generateContent(prompt)
    const response = await result.response
    let responseText = response.text().trim()

    // Clean up markdown
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
      const schedules: ParsedScheduleResponse[] = (parsed.schedules || []).map((s: {
        title?: string | null
        date?: string | null
        time?: string | null
        duration?: number | null
        isAllDay?: boolean | null
        confidence?: number
        isComplete?: boolean
        missingFields?: string[]
      }) => ({
        title: s.title || '',
        date: s.date || '',
        time: s.time || undefined,
        duration: s.duration || undefined,
        isAllDay: s.isAllDay ?? undefined,
        confidence: s.confidence || 0.8,
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
