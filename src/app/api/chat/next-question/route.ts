import { NextResponse } from 'next/server'
import { getAIProvider, generateWithProvider } from '@/lib/ai/provider'
import { getPromptContent } from '@/lib/ai-prompts'
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

// Patterns that indicate user wants to end the conversation
// Using [.!?]* at the end to allow optional punctuation
const END_CONFIRMATION_PATTERNS = [
  /^(없어|없어요|없습니다|없어용)[.!?]*$/,
  /^(아니|아니요|아닙니다|아니용)[.!?]*$/,
  /^(그게\s*다야|그게\s*다예요|그게\s*다입니다|그게\s*다)[.!?]*$/,
  /^(됐어|됐어요|됐습니다|됐어용)[.!?]*$/,
  /^(끝|끝이야|끝이에요|끝입니다)[.!?]*$/,
  /^(네|응|그래|그래요|좋아|좋아요|넵|넹|웅)[.!?]*$/, // Short affirmative to "더 이야기할 거 있어요?" means "no more"
  /^(괜찮아|괜찮아요|괜찮습니다)[.!?]*$/,
  /^(이제\s*(끝|됐어|마무리))[.!?]*/, // "이제 끝", "이제 됐어"
  /^(더\s*(없어|없어요))[.!?]*$/, // "더 없어", "더 없어요"
  /^(딱히\s*(없어|없어요))[.!?]*$/, // "딱히 없어"
]

function isEndConfirmation(message: string): boolean {
  // Normalize: trim whitespace and remove trailing periods/spaces
  const trimmed = message.trim().replace(/[\s.!?]+$/, '')
  return END_CONFIRMATION_PATTERNS.some(pattern => pattern.test(trimmed))
}

export async function POST(request: Request) {
  try {
    const { messages, questionCount, pendingSchedule, pendingEndConfirmation } = await request.json() as {
      messages: ConversationMessage[]
      questionCount: number
      pendingSchedule?: PendingScheduleInput
      pendingEndConfirmation?: boolean
    }

    // Get the current AI provider
    const provider = await getAIProvider()

    // Load personality prompt (used for all responses)
    const personality = await getPromptContent('chat.personality')

    // First greeting with personality applied
    if (questionCount === 0) {
      const greetingTemplate = await getPromptContent('chat.greeting')

      const greetingPrompt = `${personality}

다음 인사말 템플릿을 참고하여 위 성격에 맞는 자연스러운 첫 인사를 생성하세요:
---
${greetingTemplate}
---

주의사항:
- 템플릿의 의도를 유지하되, 위 성격에 맞게 말투와 표현을 조절하세요
- 이모지는 사용하지 마세요 (TTS용)
- 한 문장 또는 두 문장으로 간결하게 작성하세요
- JSON이 아닌 순수 텍스트로 응답하세요`

      const greeting = await generateWithProvider(provider, {
        messages: [{ role: 'user', content: greetingPrompt }],
      })

      return NextResponse.json({
        question: greeting.trim(),
        purpose: 'greeting',
        shouldEnd: false,
        provider,
      })
    }

    // Safety fallback: if conversation goes too long, end it (very rare case)
    if (questionCount >= 15) {
      const closingTemplate = await getPromptContent('chat.closing')
      return NextResponse.json({
        question: closingTemplate.trim(),
        purpose: 'closing',
        shouldEnd: true,
        provider,
      })
    }

    // Handle pending end confirmation state
    // If we previously asked "더 이야기하고 싶은 게 있어요?" and waiting for response
    if (pendingEndConfirmation) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()

      if (lastUserMessage && isEndConfirmation(lastUserMessage.content)) {
        // User confirmed they're done - actually end the conversation
        const closingTemplate = await getPromptContent('chat.closing')
        return NextResponse.json({
          question: closingTemplate.trim(),
          purpose: 'closing',
          shouldEnd: true,
          pendingEndConfirmation: false,
          provider,
        })
      }
      // User provided new content - continue conversation, reset pending state
      // Fall through to normal conversation logic
    }

    console.log(`[chat/next-question] Using AI provider: ${provider}`)

    // Generate natural conversational response
    const conversationContext = messages
      .map(
        (m: ConversationMessage) =>
          `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`
      )
      .join('\n')

    // Determine conversation phase
    let phaseGuidance = ''
    if (questionCount <= 2) {
      phaseGuidance = await getPromptContent('chat.phase_early')
    } else if (questionCount <= 4) {
      phaseGuidance = await getPromptContent('chat.phase_mid')
    } else {
      phaseGuidance = await getPromptContent('chat.phase_late')
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

    // Load remaining prompts from DB (personality already loaded above)
    const scheduleDetection = await getPromptContent('chat.schedule_detection', { today })
    const responseFormat = await getPromptContent('chat.response_format')

    const prompt = `${personality}

${scheduleDetection}

${pendingScheduleContext}

${responseFormat}

${phaseGuidance}

지금까지의 대화:
${conversationContext}

사용자의 마지막 메시지에서 일정이 있다면 감지하고, 부족한 정보가 있으면 자연스럽게 물어보는 응답을 JSON 형식으로 생성하세요:`

    const responseText = await generateWithProvider(provider, {
      messages: [{ role: 'user', content: prompt }],
      jsonMode: true,
    })

    let cleanedResponse = responseText.trim()

    // Clean up the response - remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7)
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3)
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3)
    }
    cleanedResponse = cleanedResponse.trim()

    let question = '그렇군요, 더 자세히 이야기해 주실 수 있어요?'
    let detectedSchedules: ParsedSchedule[] = []
    let updatedPendingSchedule: ParsedSchedule | null = null
    let shouldEnd = false

    try {
      const parsed = JSON.parse(cleanedResponse)
      question = parsed.question || question
      shouldEnd = parsed.shouldEnd === true

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
      question = cleanedResponse || question
    }

    // Intercept first shouldEnd: true and ask confirmation instead
    // Only do this if we're not already waiting for confirmation
    if (shouldEnd && !pendingEndConfirmation) {
      return NextResponse.json({
        question: '혹시 더 이야기하고 싶은 게 있어요?',
        purpose: 'end_confirmation',
        shouldEnd: false,
        pendingEndConfirmation: true,
        detectedSchedules,
        updatedPendingSchedule,
        provider,
      })
    }

    return NextResponse.json({
      question: question.trim(),
      purpose: 'conversation',
      shouldEnd,
      pendingEndConfirmation: false,
      detectedSchedules,
      updatedPendingSchedule,
      provider,
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
