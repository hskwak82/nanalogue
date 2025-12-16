import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DiaryWithTemplates, DiaryDetailResponse, UpdateDiaryRequest } from '@/types/diary'
import type { PlacedDecoration } from '@/types/customization'

// GET /api/diaries/[id] - Get diary details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch diary with templates
    const { data: diary, error } = await supabase
      .from('diaries')
      .select(`
        *,
        cover_templates(*),
        paper_templates(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 })
    }

    // Get entry count
    const { count } = await supabase
      .from('diary_entries')
      .select('*', { count: 'exact', head: true })
      .eq('diary_id', id)

    // Get adjacent diaries for navigation
    const { data: allDiaries } = await supabase
      .from('diaries')
      .select('id, volume_number, title')
      .eq('user_id', user.id)
      .order('volume_number', { ascending: true })

    const currentIndex = allDiaries?.findIndex(d => d.id === id) ?? -1
    const prevDiary = currentIndex > 0 ? allDiaries![currentIndex - 1] : null
    const nextDiary = currentIndex < (allDiaries?.length ?? 0) - 1 ? allDiaries![currentIndex + 1] : null

    const transformedDiary: DiaryWithTemplates = {
      id: diary.id,
      user_id: diary.user_id,
      volume_number: diary.volume_number,
      title: diary.title,
      status: diary.status,
      start_date: diary.start_date,
      end_date: diary.end_date,
      cover_template_id: diary.cover_template_id,
      paper_template_id: diary.paper_template_id,
      cover_decorations: (diary.cover_decorations || []) as PlacedDecoration[],
      paper_decorations: (diary.paper_decorations || []) as PlacedDecoration[],
      spine_color: diary.spine_color,
      spine_gradient: diary.spine_gradient,
      created_at: diary.created_at,
      updated_at: diary.updated_at,
      cover_template: diary.cover_templates || null,
      paper_template: diary.paper_templates || null,
      entry_count: count || 0,
    }

    const response: DiaryDetailResponse = {
      diary: transformedDiary,
      prevDiary,
      nextDiary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/diaries/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/diaries/[id] - Update diary
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateDiaryRequest = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.cover_template_id !== undefined) updateData.cover_template_id = body.cover_template_id
    if (body.paper_template_id !== undefined) updateData.paper_template_id = body.paper_template_id
    if (body.cover_decorations !== undefined) updateData.cover_decorations = body.cover_decorations
    if (body.paper_decorations !== undefined) updateData.paper_decorations = body.paper_decorations
    if (body.spine_color !== undefined) updateData.spine_color = body.spine_color
    if (body.spine_gradient !== undefined) updateData.spine_gradient = body.spine_gradient

    const { data: diary, error } = await supabase
      .from('diaries')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        cover_templates(*),
        paper_templates(*)
      `)
      .single()

    if (error) {
      console.error('Error updating diary:', error)
      return NextResponse.json({ error: 'Failed to update diary' }, { status: 500 })
    }

    if (!diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 })
    }

    const response: DiaryWithTemplates = {
      ...diary,
      cover_decorations: (diary.cover_decorations || []) as PlacedDecoration[],
      paper_decorations: (diary.paper_decorations || []) as PlacedDecoration[],
      cover_template: diary.cover_templates || null,
      paper_template: diary.paper_templates || null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in PATCH /api/diaries/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/diaries/[id] - Delete diary
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if this is the only diary
    const { count } = await supabase
      .from('diaries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only diary. Create a new one first.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('diaries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting diary:', error)
      return NextResponse.json({ error: 'Failed to delete diary' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/diaries/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
