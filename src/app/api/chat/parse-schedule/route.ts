import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface ParseScheduleRequest {
  text: string
  referenceDate: string  // YYYY-MM-DD (today's date for relative parsing)
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
    const { text, referenceDate }: ParseScheduleRequest = await request.json()

    if (!text || !referenceDate) {
      return NextResponse.json({
        hasSchedule: false,
        schedules: [],
      })
    }

    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `당신은 한국어 자연어에서 일정 정보를 추출하는 전문가입니다.

사용자 메시지에서 일정, 약속, 계획, 미팅, 회의 등의 정보를 추출하세요.

오늘 날짜: ${referenceDate}

규칙:
1. 상대적 날짜를 절대 날짜로 변환하세요:
   - "내일" → 오늘 + 1일
   - "모레" → 오늘 + 2일
   - "다음주 월요일" → 다음 주 월요일 날짜
   - "이번 주말" → 이번 주 토요일 또는 일요일
2. 시간이 명시되지 않으면 time을 null로 설정
3. 시간 해석:
   - "3시" → 문맥에 따라 "15:00" 또는 "03:00" (보통 오후로 추정)
   - "오전 10시" → "10:00"
   - "오후 3시" → "15:00"
   - "저녁" → "18:00"
   - "점심" → "12:00"
   - "아침" → "09:00"
4. 일정이 없으면 빈 배열 반환
5. confidence 점수:
   - 0.9+: 명확한 일정 ("내일 3시에 회의")
   - 0.7-0.9: 대략적인 일정 ("다음주에 미팅 있어")
   - 0.5-0.7: 불확실한 언급 ("언젠가 만나자")

사용자 메시지: "${text}"

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "schedules": [
    {"title": "일정 제목", "date": "YYYY-MM-DD", "time": "HH:mm" 또는 null, "confidence": 0.9}
  ]
}

일정이 없으면:
{"schedules": []}`

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
        date: string
        time?: string | null
        confidence: number
      }) => ({
        title: s.title,
        date: s.date,
        time: s.time || undefined,
        confidence: s.confidence,
      }))

      return NextResponse.json({
        hasSchedule: schedules.length > 0,
        schedules,
      })
    } catch {
      console.error('Failed to parse AI response:', responseText)
      return NextResponse.json({
        hasSchedule: false,
        schedules: [],
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
