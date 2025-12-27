import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getPromptById, updatePrompt, getPromptVersions } from '@/lib/ai-prompts'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/prompts/[id] - Get single prompt with version history
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const prompt = await getPromptById(id)

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    const versions = await getPromptVersions(id)

    return NextResponse.json({ prompt, versions })
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 })
  }
}

// PATCH /api/admin/prompts/[id] - Update prompt
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { content, variables, changeSummary } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const updatedPrompt = await updatePrompt(
      id,
      content,
      variables || [],
      changeSummary || null,
      auth.userId
    )

    if (!updatedPrompt) {
      return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
    }

    return NextResponse.json({ prompt: updatedPrompt })
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 })
  }
}
