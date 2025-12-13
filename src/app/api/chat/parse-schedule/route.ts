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
1. 일정 관련 키워드가 있으면 무조건 감지하세요 (회의, 약속, 미팅, 출장, 병원, 면접 등)
2. 날짜가 없어도 일정으로 감지하고 date를 null로 설정
3. 상대적 날짜를 절대 날짜로 변환:
   - "내일" → 오늘 + 1일
   - "모레" → 오늘 + 2일
   - "다음주 월요일" → 다음 주 월요일 날짜
4. 시간이 명시되지 않으면 time을 null로 설정
5. 시간 해석:
   - "3시" → "15:00" (보통 오후로 추정)
   - "오전 10시" → "10:00"
   - "오후 3시" → "15:00"
   - "저녁" → "18:00"
   - "점심" → "12:00"
   - "아침" → "09:00"
6. 부족한 정보 식별:
   - date가 null이면 missingFields에 "date" 추가
   - time이 null이면 missingFields에 "time" 추가
7. 부족한 정보가 있으면 자연스러운 추가 질문 생성

사용자 메시지: "${text}"

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
- "회의 약속 있어" → date, time 모두 없음 → followUpQuestion: "회의가 언제 있으세요?"
- "내일 점심 약속" → time 없음 → followUpQuestion: "몇 시에 만나기로 하셨어요?"
- "내일 3시 회의" → 모든 정보 있음 → followUpQuestion: null`

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
