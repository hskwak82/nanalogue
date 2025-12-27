import { NextResponse } from 'next/server'
import { getAIProvider, generateVisionWithProvider } from '@/lib/ai/provider'
import { getPromptContent } from '@/lib/ai-prompts'

// Prompt for image analysis (to provide context for Realtime conversations)
const DEFAULT_IMAGE_ANALYSIS_PROMPT = `이 사진을 분석하여 사용자가 오늘 경험했을 것 같은 상황을 설명해주세요.

분석할 내용:
1. 사진에 보이는 장소, 사물, 분위기
2. 사진을 통해 추측할 수 있는 사용자의 활동이나 경험
3. 대화를 시작할 때 자연스럽게 언급할 수 있는 포인트

응답은 한두 문장으로 간결하게 작성하세요.
이모지는 사용하지 마세요.`

export async function POST(request: Request) {
  try {
    const { imageDataUrl } = await request.json() as {
      imageDataUrl: string
    }

    if (!imageDataUrl) {
      return NextResponse.json(
        { error: 'imageDataUrl is required' },
        { status: 400 }
      )
    }

    // Get the current AI provider
    const provider = await getAIProvider()

    // Load personality prompt
    const personality = await getPromptContent('chat.personality')

    // Try to get image analysis prompt from DB, fallback to default
    let imageAnalysisPrompt: string
    try {
      imageAnalysisPrompt = await getPromptContent('chat.image_analysis')
    } catch {
      imageAnalysisPrompt = DEFAULT_IMAGE_ANALYSIS_PROMPT
    }

    console.log(`[chat/analyze-image] Analyzing image with provider: ${provider}`)

    // Use Vision API to analyze the image
    const context = await generateVisionWithProvider(provider, {
      messages: [
        { role: 'system', content: personality },
        { role: 'user', content: imageAnalysisPrompt },
      ],
      imageUrl: imageDataUrl,
    })

    return NextResponse.json({
      context: context.trim(),
      provider,
    })
  } catch (error) {
    console.error('Error analyzing image:', error)

    return NextResponse.json(
      { error: 'Failed to analyze image', context: null },
      { status: 500 }
    )
  }
}
