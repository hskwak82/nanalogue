import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { getAllPrompts, getPromptsByCategory, clearPromptCache } from '@/lib/ai-prompts'

// GET /api/admin/prompts - Get all prompts (optionally filtered by category)
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let prompts
    if (category) {
      prompts = await getPromptsByCategory(category)
    } else {
      prompts = await getAllPrompts()
    }

    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 })
  }
}

// POST /api/admin/prompts/cache-clear - Clear prompt cache
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { action } = await request.json()

    if (action === 'clear-cache') {
      clearPromptCache()
      return NextResponse.json({ success: true, message: 'Cache cleared' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in prompts POST:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
