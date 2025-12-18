import { NextResponse } from 'next/server'
import type { ConversationMessage, ParsedSchedule } from '@/types/database'

interface PendingScheduleInput {
  id: string
  title: string
  date: string
  time?: string
  duration?: number
  endDate?: string
  missingFields?: string[]
}

export async function POST(request: Request) {
  try {
    const { messages, questionCount, pendingSchedule } = await request.json() as {
      messages: ConversationMessage[]
      questionCount: number
      pendingSchedule?: PendingScheduleInput
    }

    // First greeting (no emoji for TTS)
    if (questionCount === 0) {
      return NextResponse.json({
        question: '안녕하세요! 오늘 하루는 어떠셨나요? 편하게 이야기해 주세요.',
        purpose: 'greeting',
        shouldEnd: false,
      })
    }

    // Closing message after enough conversation
    if (questionCount >= 7) {
      return NextResponse.json({
        question: '오늘 이야기 나눠주셔서 감사해요. 이제 말씀해주신 내용을 바탕으로 오늘의 일기를 작성해 드릴게요.',
        purpose: 'closing',
        shouldEnd: true,
      })
    }

    // Generate natural conversational response
    const conversationContext = messages
      .map(
        (m: ConversationMessage) =>
          `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`
      )
      .join('\n')

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    // Determine conversation phase
    let phaseGuidance = ''
    if (questionCount <= 2) {
      phaseGuidance = '초반 대화: 사용자의 하루 전반적인 기분과 주요 일과를 파악하세요.'
    } else if (questionCount <= 4) {
      phaseGuidance = '중반 대화: 사용자가 언급한 내용 중 흥미로운 부분을 더 깊이 탐색하세요. 감정이나 구체적인 상황을 물어보세요.'
    } else {
      phaseGuidance = '후반 대화: 감사했던 점, 내일 계획, 또는 오늘의 교훈 등 하루를 마무리하는 질문을 하세요.'
    }

    // Get today's date for schedule parsing
    const today = new Date().toISOString().split('T')[0]

    // Build pending schedule context if exists
    let pendingScheduleContext = ''
    if (pendingSchedule && pendingSchedule.missingFields && pendingSchedule.missingFields.length > 0) {
      pendingScheduleContext = `
현재 확인 중인 일정:
- 제목: ${pendingSchedule.title}
- 날짜: ${pendingSchedule.date}
- 시간: ${pendingSchedule.time || '미정'}
- 소요시간: ${pendingSchedule.duration ? pendingSchedule.duration + '분' : '미정'}
- 종료일: ${pendingSchedule.endDate || '미정'}
- 부족한 정보: ${pendingSchedule.missingFields.join(', ')}

사용자의 마지막 답변에서 위 부족한 정보를 추출하세요.
`
    }

    const prompt = `당신은 따뜻하고 공감 능력이 뛰어난 친구 같은 AI입니다.
사용자의 하루를 자연스럽게 들으면서 일기 작성을 위한 정보를 모읍니다.

중요 지침:
1. 먼저 사용자가 방금 말한 내용에 대해 짧게 공감하거나 반응해주세요
2. 그 다음 자연스럽게 이어지는 질문을 해주세요
3. 마치 친한 친구와 대화하듯 편안하고 자연스럽게 대화하세요
4. 너무 형식적이거나 딱딱하지 않게, 구어체로 말하세요
5. 이모지나 특수문자는 사용하지 마세요 (음성으로 읽힙니다)

일정 감지 및 추가 질문 지침:
- **미래 일정만** 감지하세요! 과거에 있었던 일은 일정이 아닙니다.
- 미래 일정 예시 (감지해야 함): "내일 3시에 회의 있어", "다음주 월요일 점심 약속", "모레 병원 가야해", "다음주에 미팅 잡혀있어"
- 과거 사건 예시 (감지하면 안됨): "오늘 1시간 미팅했어", "아까 3시에 회의했어", "오늘 친구 만났어", "방금 점심 먹었어"
- 감지 기준: "~할 예정", "~있어", "~가야해", "~해야해" 등 미래를 나타내는 표현이 있어야 함
- 단순 시간 언급("1시간 동안", "3시에")은 과거 사건 서술일 수 있으니 문맥을 확인하세요
- 오늘 날짜: ${today}
- 상대적 날짜를 절대 날짜(YYYY-MM-DD)로 변환하세요

일정 정보가 부족할 때:
- 시간이 없으면: "몇 시에 잡을까요?" 또는 "몇 시쯤이에요?"
- 소요시간이 불명확하면: "대략 몇 시간 정도 예상하세요?"
- 종일 일정인데 기간이 불명확하면: "하루 일정인가요, 아니면 며칠 동안인가요?"
- 자연스럽게 대화 흐름에 녹여서 질문하세요

${pendingScheduleContext}

응답 형식 (반드시 JSON으로):
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
7. 미래 일정이 없으면 detectedSchedules는 빈 배열 []

${phaseGuidance}

지금까지의 대화:
${conversationContext}

사용자의 마지막 메시지에서 일정이 있다면 감지하고, 부족한 정보가 있으면 자연스럽게 물어보는 응답을 JSON 형식으로 생성하세요:`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    let responseText = (data.choices?.[0]?.message?.content || '').trim()

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

    let question = '그렇군요, 더 자세히 이야기해 주실 수 있어요?'
    let detectedSchedules: ParsedSchedule[] = []
    let updatedPendingSchedule: ParsedSchedule | null = null

    try {
      const parsed = JSON.parse(responseText)
      question = parsed.question || question

      if (parsed.detectedSchedules && Array.isArray(parsed.detectedSchedules)) {
        detectedSchedules = parsed.detectedSchedules.map((s: {
          title: string
          date: string
          endDate?: string | null
          time?: string | null
          duration?: number | null
          confidence: number
          isComplete?: boolean
          missingFields?: string[]
        }) => ({
          title: s.title,
          date: s.date,
          endDate: s.endDate || undefined,
          time: s.time || undefined,
          duration: s.duration || undefined,
          confidence: s.confidence,
          isComplete: s.isComplete ?? false,
          missingFields: s.missingFields || [],
        }))
      }

      // Handle updated pending schedule (when user answered follow-up questions)
      if (parsed.updatedPendingSchedule) {
        const u = parsed.updatedPendingSchedule
        updatedPendingSchedule = {
          title: u.title,
          date: u.date,
          endDate: u.endDate || undefined,
          time: u.time || undefined,
          duration: u.duration || undefined,
          confidence: u.confidence || 0.9,
          isComplete: u.isComplete ?? true,
          missingFields: u.missingFields || [],
        }
      }
    } catch {
      // If JSON parsing fails, use the raw text as question
      question = responseText || question
    }

    return NextResponse.json({
      question: question.trim(),
      purpose: 'conversation',
      shouldEnd: false,
      detectedSchedules,
      updatedPendingSchedule,
    })
  } catch (error) {
    console.error('Error generating question:', error)

    // Fallback response
    return NextResponse.json({
      question: '그렇군요. 더 자세히 이야기해 주실 수 있어요?',
      purpose: 'fallback',
      shouldEnd: false,
    })
  }
}
