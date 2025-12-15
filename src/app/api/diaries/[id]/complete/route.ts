import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CompleteDiaryRequest, DiaryWithTemplates } from '@/types/diary'
import type { PlacedDecoration } from '@/types/customization'

// POST /api/diaries/[id]/complete - Complete (finish) a diary
export async function POST(
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

    const body: CompleteDiaryRequest = await request.json()

    // Get the diary to complete
    const { data: diary, error: fetchError } = await supabase
      .from('diaries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 })
    }

    if (diary.status === 'completed') {
      return NextResponse.json({ error: 'Diary is already completed' }, { status: 400 })
    }

    // Determine end date (default to today)
    const endDate = body.end_date || new Date().toISOString().split('T')[0]

    // Update diary to completed status
    const { data: completedDiary, error: updateError } = await supabase
      .from('diaries')
      .update({
        status: 'completed',
        end_date: endDate,
      })
      .eq('id', id)
      .select(`
        *,
        cover_templates(*),
        paper_templates(*)
      `)
      .single()

    if (updateError) {
      console.error('Error completing diary:', updateError)
      return NextResponse.json({ error: 'Failed to complete diary' }, { status: 500 })
    }

    let newDiary: DiaryWithTemplates | null = null

    // Optionally create a new diary
    if (body.create_new) {
      const nextVolumeNumber = diary.volume_number + 1
      const newTitle = body.new_diary_title || `${nextVolumeNumber}권`

      const { data: createdDiary, error: createError } = await supabase
        .from('diaries')
        .insert({
          user_id: user.id,
          volume_number: nextVolumeNumber,
          title: newTitle,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          // Inherit template settings from completed diary
          cover_template_id: diary.cover_template_id,
          paper_template_id: diary.paper_template_id,
        })
        .select(`
          *,
          cover_templates(*),
          paper_templates(*)
        `)
        .single()

      if (!createError && createdDiary) {
        newDiary = {
          ...createdDiary,
          cover_decorations: [] as PlacedDecoration[],
          cover_template: createdDiary.cover_templates || null,
          paper_template: createdDiary.paper_templates || null,
          entry_count: 0,
        }
      }
    }

    const response = {
      completedDiary: {
        ...completedDiary,
        cover_decorations: (completedDiary.cover_decorations || []) as PlacedDecoration[],
        cover_template: completedDiary.cover_templates || null,
        paper_template: completedDiary.paper_templates || null,
      } as DiaryWithTemplates,
      newDiary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/diaries/[id]/complete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
