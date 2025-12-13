import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ConversationMessage } from '@/types/database'

function getGeminiClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
}

export async function POST(request: Request) {
  try {
    const { messages, questionCount } = await request.json()

    // First greeting
    if (questionCount === 0) {
      return NextResponse.json({
        question: '안녕하세요! 오늘 하루는 어떠셨나요? 편하게 이야기해 주세요 😊',
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

    const genAI = getGeminiClient()
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Determine conversation phase
    let phaseGuidance = ''
    if (questionCount <= 2) {
      phaseGuidance = '초반 대화: 사용자의 하루 전반적인 기분과 주요 일과를 파악하세요.'
    } else if (questionCount <= 4) {
      phaseGuidance = '중반 대화: 사용자가 언급한 내용 중 흥미로운 부분을 더 깊이 탐색하세요. 감정이나 구체적인 상황을 물어보세요.'
    } else {
      phaseGuidance = '후반 대화: 감사했던 점, 내일 계획, 또는 오늘의 교훈 등 하루를 마무리하는 질문을 하세요.'
    }

    const prompt = `당신은 따뜻하고 공감 능력이 뛰어난 친구 같은 AI입니다.
사용자의 하루를 자연스럽게 들으면서 일기 작성을 위한 정보를 모읍니다.

중요 지침:
1. 먼저 사용자가 방금 말한 내용에 대해 짧게 공감하거나 반응해주세요
2. 그 다음 자연스럽게 이어지는 질문을 해주세요
3. 마치 친한 친구와 대화하듯 편안하고 자연스럽게 대화하세요
4. 너무 형식적이거나 딱딱하지 않게, 구어체로 말하세요
5. 이모지는 적절히 사용해도 됩니다

응답 형식:
- 공감/반응 (1-2문장) + 자연스러운 연결 질문 (1문장)
- 전체 2-3문장으로 짧게 유지

${phaseGuidance}

지금까지의 대화:
${conversationContext}

다음 응답을 생성하세요 (공감 + 질문):`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const question =
      response.text() || '그렇군요, 더 자세히 이야기해 주실 수 있어요?'

    return NextResponse.json({
      question: question.trim(),
      purpose: 'conversation',
      shouldEnd: false,
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
