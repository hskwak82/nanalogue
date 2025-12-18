import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DiaryWithTemplates } from '@/types/diary'
import { SPINE_WIDTH_RATIO } from '@/types/diary'
import type { PlacedDecoration } from '@/types/customization'
import {
  getQuarterFromDate,
  getQuarterTitle,
  getQuarterDateRange,
} from '@/lib/quarter'

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

// GET /api/diaries/active - Get current active diary (or auto-create quarterly diary)
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate current quarter
    const now = new Date()
    const currentQuarter = getQuarterFromDate(now)
    const { start: quarterStart, end: quarterEnd } = getQuarterDateRange(
      currentQuarter.year,
      currentQuarter.quarter
    )

    // Try to find diary for current quarter (based on start_date)
    let { data: diary } = await supabase
      .from('diaries')
      .select(`
        *,
        cover_templates(*),
        paper_templates(*)
      `)
      .eq('user_id', user.id)
      .gte('start_date', quarterStart)
      .lte('start_date', quarterEnd)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // If no diary for current quarter, auto-create one
    if (!diary) {
      // Get the most recent diary for inheriting customization
      const { data: prevDiary } = await supabase
        .from('diaries')
        .select('*')
        .eq('user_id', user.id)
        .order('volume_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Mark previous diary as completed if it's active
      if (prevDiary && prevDiary.status === 'active') {
        const prevQuarter = getQuarterFromDate(new Date(prevDiary.start_date))
        const prevRange = getQuarterDateRange(prevQuarter.year, prevQuarter.quarter)

        await supabase
          .from('diaries')
          .update({
            status: 'completed',
            end_date: prevRange.end,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prevDiary.id)
      }

      // Calculate next volume number
      const nextVolumeNumber = (prevDiary?.volume_number || 0) + 1

      // Check for legacy customization if this is the first diary
      let legacyCustomization = null
      if (!prevDiary) {
        const { data: customization } = await supabase
          .from('diary_customization')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
        legacyCustomization = customization
      }

      // Create new quarterly diary
      const { data: newDiary, error: createError } = await supabase
        .from('diaries')
        .insert({
          user_id: user.id,
          volume_number: nextVolumeNumber,
          title: getQuarterTitle(currentQuarter.year, currentQuarter.quarter),
          status: 'active',
          start_date: quarterStart,
          // Inherit customization from previous diary or legacy
          cover_template_id: prevDiary?.cover_template_id || legacyCustomization?.cover_template_id || null,
          paper_template_id: prevDiary?.paper_template_id || legacyCustomization?.paper_template_id || null,
          cover_decorations: prevDiary?.cover_decorations || legacyCustomization?.cover_decorations || [],
          paper_decorations: prevDiary?.paper_decorations || [],
          spine_color: prevDiary?.spine_color || null,
          spine_gradient: prevDiary?.spine_gradient || null,
        })
        .select(`
          *,
          cover_templates(*),
          paper_templates(*)
        `)
        .single()

      if (createError) {
        console.error('Error creating quarterly diary:', createError)
        return NextResponse.json({ error: 'Failed to create diary' }, { status: 500 })
      }

      diary = newDiary
      console.log(`[diary/active] Auto-created quarterly diary: ${newDiary.title} (Volume ${newDiary.volume_number})`)
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
