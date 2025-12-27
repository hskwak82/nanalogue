import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getAIProvider, generateWithProvider } from '@/lib/ai/provider'

// POST /api/admin/prompts/test - Test prompt with sample data
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { content, testInput, variables } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Replace variables in content
    let processedContent = content
    if (variables && typeof variables === 'object') {
      for (const [key, value] of Object.entries(variables)) {
        if (typeof value === 'string') {
          processedContent = processedContent.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
            value
          )
        }
      }
    }

    // Get AI provider
    const provider = await getAIProvider()

    // Generate test response
    const response = await generateWithProvider(provider, {
      messages: [
        { role: 'system', content: processedContent },
        { role: 'user', content: testInput || '테스트 입력입니다.' },
      ],
    })

    return NextResponse.json({
      success: true,
      provider,
      processedContent,
      response,
    })
  } catch (error) {
    console.error('Error testing prompt:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to test prompt'
    }, { status: 500 })
  }
}
