import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ConversationMessage } from '@/types/database'

function getGeminiClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
}

const QUESTION_FLOW = [
  {
    purpose: 'greeting',
    template: '안녕하세요! 오늘 하루는 어떠셨나요? 기분이나 컨디션은 어떠세요?',
  },
  {
    purpose: 'highlight',
    template:
      '오늘 가장 기억에 남는 일이 있다면 무엇인가요? 좋은 일이든 힘든 일이든 괜찮아요.',
  },
  {
    purpose: 'detail',
    template: null, // AI generates follow-up based on previous answer
  },
  {
    purpose: 'emotion',
    template: null, // AI generates based on context
  },
  {
    purpose: 'gratitude',
    template: '오늘 하루 중에 감사하거나 다행이라고 느낀 순간이 있었나요?',
  },
  {
    purpose: 'tomorrow',
    template:
      '내일은 어떤 하루가 되면 좋겠어요? 특별히 계획하거나 기대하는 일이 있나요?',
  },
  {
    purpose: 'closing',
    template:
      '오늘 대화 감사해요. 이제 말씀해주신 내용을 바탕으로 오늘의 일기를 작성해 드릴게요.',
  },
]

export async function POST(request: Request) {
  try {
    const { messages, questionCount } = await request.json()

    // If it's the first question, use greeting template
    if (questionCount === 0) {
      return NextResponse.json({
        question: QUESTION_FLOW[0].template,
        purpose: QUESTION_FLOW[0].purpose,
        shouldEnd: false,
      })
    }

    // If we've reached the end
    if (questionCount >= 7) {
      return NextResponse.json({
        question: QUESTION_FLOW[6].template,
        purpose: 'closing',
        shouldEnd: true,
      })
    }

    // For dynamic questions, use AI to generate contextual follow-up
    const flowStep = QUESTION_FLOW[Math.min(questionCount, 5)]

    if (flowStep.template) {
      return NextResponse.json({
        question: flowStep.template,
        purpose: flowStep.purpose,
        shouldEnd: false,
      })
    }

    // Generate AI question based on conversation context
    const conversationContext = messages
      .map(
        (m: ConversationMessage) =>
          `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`
      )
      .join('\n')

    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `당신은 따뜻하고 공감적인 일기 도우미입니다.
사용자의 하루를 기록하기 위해 자연스러운 대화를 나눕니다.
현재 대화 맥락을 바탕으로 적절한 후속 질문을 해주세요.

질문 가이드라인:
- 짧고 간결하게 (1-2문장)
- 공감하며 진심 어린 관심을 보여주세요
- 감정을 더 깊이 탐색하거나, 구체적인 상황을 물어보세요
- 판단하지 않고 경청하는 태도를 유지하세요

현재 목적: ${flowStep.purpose === 'detail' ? '구체적인 상황이나 느낌 탐색' : '감정 탐색'}

지금까지의 대화:
${conversationContext}

다음 질문을 생성해주세요. 질문만 출력하세요.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const question =
      response.text() || '그 경험에 대해 더 자세히 이야기해 주시겠어요?'

    return NextResponse.json({
      question: question.trim(),
      purpose: flowStep.purpose,
      shouldEnd: false,
    })
  } catch (error) {
    console.error('Error generating question:', error)

    // Fallback question
    return NextResponse.json({
      question: '그 경험이 어땠는지 더 자세히 말씀해 주시겠어요?',
      purpose: 'detail',
      shouldEnd: false,
    })
  }
}
