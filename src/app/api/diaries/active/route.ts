import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DiaryWithTemplates } from '@/types/diary'
import { SPINE_WIDTH_RATIO } from '@/types/diary'
import type { PlacedDecoration } from '@/types/customization'

// POST /api/diaries/active - Set a diary as active
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { diary_id } = await request.json()

    if (!diary_id) {
      return NextResponse.json({ error: 'diary_id is required' }, { status: 400 })
    }

    // Verify diary belongs to user
    const { data: diary } = await supabase
      .from('diaries')
      .select('id')
      .eq('id', diary_id)
      .eq('user_id', user.id)
      .single()

    if (!diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 })
    }

    // Set all other diaries to non-active (keep completed ones as completed)
    await supabase
      .from('diaries')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .neq('id', diary_id)

    // Set the selected diary as active
    const { error } = await supabase
      .from('diaries')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', diary_id)

    if (error) {
      console.error('Error setting diary as active:', error)
      return NextResponse.json({ error: 'Failed to activate diary' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/diaries/active:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/diaries/active - Get current active diary (or create first one)
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to find active diary
    let { data: diary, error } = await supabase
      .from('diaries')
      .select(`
        *,
        cover_templates(*),
        paper_templates(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('volume_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    // If no active diary, check if there are any diaries at all
    if (!diary) {
      const { count } = await supabase
        .from('diaries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // If no diaries exist, create the first one
      if (count === 0) {
        // Check if user has existing customization to inherit
        const { data: customization } = await supabase
          .from('diary_customization')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        // Get first entry date if exists
        const { data: firstEntry } = await supabase
          .from('diary_entries')
          .select('entry_date')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: true })
          .limit(1)
          .maybeSingle()

        const startDate = firstEntry?.entry_date || new Date().toISOString().split('T')[0]

        const { data: newDiary, error: createError } = await supabase
          .from('diaries')
          .insert({
            user_id: user.id,
            volume_number: 1,
            title: '나의 일기장',
            status: 'active',
            start_date: startDate,
            cover_template_id: customization?.cover_template_id || null,
            paper_template_id: customization?.paper_template_id || null,
            cover_decorations: customization?.cover_decorations || [],
          })
          .select(`
            *,
            cover_templates(*),
            paper_templates(*)
          `)
          .single()

        if (createError) {
          console.error('Error creating first diary:', createError)
          return NextResponse.json({ error: 'Failed to create diary' }, { status: 500 })
        }

        diary = newDiary
      } else {
        // If there are diaries but none active, return null (user needs to create new one)
        return NextResponse.json({ diary: null, needsNewDiary: true })
      }
    }

    if (error) {
      console.error('Error fetching active diary:', error)
      return NextResponse.json({ error: 'Failed to fetch diary' }, { status: 500 })
    }

    // Get entry count
    const { count: entryCount } = await supabase
      .from('diary_entries')
      .select('*', { count: 'exact', head: true })
      .eq('diary_id', diary.id)

    const response: DiaryWithTemplates = {
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
      cover_image_url: diary.cover_image_url || null,
      spine_position: diary.spine_position ?? null,
      spine_width: diary.spine_width ?? SPINE_WIDTH_RATIO,
      spine_color: diary.spine_color,
      spine_gradient: diary.spine_gradient,
      created_at: diary.created_at,
      updated_at: diary.updated_at,
      cover_template: diary.cover_templates || null,
      paper_template: diary.paper_templates || null,
      entry_count: entryCount || 0,
    }

    return NextResponse.json({ diary: response })
  } catch (error) {
    console.error('Error in GET /api/diaries/active:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
