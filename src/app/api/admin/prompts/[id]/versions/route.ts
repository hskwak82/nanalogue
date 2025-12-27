import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getPromptVersions } from '@/lib/ai-prompts'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/prompts/[id]/versions - Get version history
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const versions = await getPromptVersions(id)

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
  }
}
