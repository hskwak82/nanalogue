import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { rollbackPrompt } from '@/lib/ai-prompts'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/prompts/[id]/rollback - Rollback to specific version
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { version } = await request.json()

    if (typeof version !== 'number') {
      return NextResponse.json({ error: 'Version number is required' }, { status: 400 })
    }

    const updatedPrompt = await rollbackPrompt(id, version, auth.userId)

    if (!updatedPrompt) {
      return NextResponse.json({ error: 'Failed to rollback prompt' }, { status: 500 })
    }

    return NextResponse.json({ prompt: updatedPrompt })
  } catch (error) {
    console.error('Error rolling back prompt:', error)
    return NextResponse.json({ error: 'Failed to rollback prompt' }, { status: 500 })
  }
}
