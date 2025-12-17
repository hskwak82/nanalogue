import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DiaryWithTemplates, DiaryListResponse, CreateDiaryRequest } from '@/types/diary'
import type { PlacedDecoration } from '@/types/customization'

// GET /api/diaries - List all user's diaries
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all diaries with templates
    const { data: diaries, error } = await supabase
      .from('diaries')
      .select(`
        *,
        cover_templates(*),
        paper_templates(*)
      `)
      .eq('user_id', user.id)
      .order('volume_number', { ascending: true })

    if (error) {
      console.error('Error fetching diaries:', error)
      return NextResponse.json({ error: 'Failed to fetch diaries' }, { status: 500 })
    }

    // Get entry counts for each diary
    const diaryIds = diaries?.map(d => d.id) || []
    let entryCounts: Record<string, number> = {}

    if (diaryIds.length > 0) {
      const { data: counts } = await supabase
        .from('diary_entries')
        .select('diary_id')
        .in('diary_id', diaryIds)

      if (counts) {
        entryCounts = counts.reduce((acc, entry) => {
          if (entry.diary_id) {
            acc[entry.diary_id] = (acc[entry.diary_id] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Transform to DiaryWithTemplates
    const transformedDiaries: DiaryWithTemplates[] = (diaries || []).map(diary => ({
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
      spine_image_url: diary.spine_image_url || null,
      spine_position: diary.spine_position ?? null,
      spine_width: diary.spine_width ?? 0.30,
      spine_color: diary.spine_color,
      spine_gradient: diary.spine_gradient,
      created_at: diary.created_at,
      updated_at: diary.updated_at,
      cover_template: diary.cover_templates || null,
      paper_template: diary.paper_templates || null,
      entry_count: entryCounts[diary.id] || 0,
    }))

    // Find active diary
    const activeDiary = transformedDiaries.find(d => d.status === 'active') || null

    const response: DiaryListResponse = {
      diaries: transformedDiaries,
      activeDiary,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in GET /api/diaries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/diaries - Create new diary
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateDiaryRequest = await request.json()

    // Get next volume number
    const { data: maxVolumeData } = await supabase
      .from('diaries')
      .select('volume_number')
      .eq('user_id', user.id)
      .order('volume_number', { ascending: false })
      .limit(1)
      .single()

    const nextVolumeNumber = (maxVolumeData?.volume_number || 0) + 1

    // If inherit_from_previous, get previous diary's customization
    let inheritedData = {}
    if (body.inherit_from_previous && maxVolumeData) {
      const { data: prevDiary } = await supabase
        .from('diaries')
        .select('cover_template_id, paper_template_id')
        .eq('user_id', user.id)
        .eq('volume_number', maxVolumeData.volume_number)
        .single()

      if (prevDiary) {
        inheritedData = {
          cover_template_id: prevDiary.cover_template_id,
          paper_template_id: prevDiary.paper_template_id,
        }
      }
    }

    // Create new diary
    const { data: newDiary, error } = await supabase
      .from('diaries')
      .insert({
        user_id: user.id,
        volume_number: nextVolumeNumber,
        title: body.title || `${nextVolumeNumber}권`,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        cover_template_id: body.cover_template_id || null,
        paper_template_id: body.paper_template_id || null,
        ...inheritedData,
      })
      .select(`
        *,
        cover_templates(*),
        paper_templates(*)
      `)
      .single()

    if (error) {
      console.error('Error creating diary:', error)
      return NextResponse.json({ error: 'Failed to create diary' }, { status: 500 })
    }

    const response: DiaryWithTemplates = {
      ...newDiary,
      cover_decorations: [],
      cover_template: newDiary.cover_templates || null,
      paper_template: newDiary.paper_templates || null,
      entry_count: 0,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/diaries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
