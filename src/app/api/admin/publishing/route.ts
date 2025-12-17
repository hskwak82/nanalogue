import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import type { PublishJobWithDiary } from '@/types/publishing'

// GET /api/admin/publishing - Get all publish jobs
export async function GET() {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getAdminServiceClient()

    // Get jobs with diary and user info
    const { data: jobs, error } = await supabase
      .from('diary_publish_jobs')
      .select(`
        *,
        diary:diaries!inner(
          id,
          volume_number,
          title,
          user_id,
          start_date,
          end_date,
          cover_image_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Get user info for each job
    const userIds = [...new Set(jobs?.map((j) => j.diary?.user_id).filter(Boolean))]
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('id', userIds)

    const userMap = new Map(users?.map((u) => [u.id, u]))

    // Get entry counts for diaries
    const diaryIds = jobs?.map((j) => j.diary_id) || []
    const { data: entryCounts } = await supabase
      .from('diary_entries')
      .select('diary_id')
      .in('diary_id', diaryIds)

    const entryCountMap = new Map<string, number>()
    entryCounts?.forEach((e) => {
      const count = entryCountMap.get(e.diary_id) || 0
      entryCountMap.set(e.diary_id, count + 1)
    })

    // Transform to response format
    const result: PublishJobWithDiary[] = (jobs || []).map((job) => ({
      id: job.id,
      diary_id: job.diary_id,
      admin_user_id: job.admin_user_id,
      status: job.status,
      front_cover_url: job.front_cover_url,
      back_cover_url: job.back_cover_url,
      spine_url: job.spine_url,
      inner_pages_url: job.inner_pages_url,
      zip_url: job.zip_url,
      page_count: job.page_count,
      error_message: job.error_message,
      created_at: job.created_at,
      completed_at: job.completed_at,
      diary: {
        id: job.diary.id,
        volume_number: job.diary.volume_number,
        title: job.diary.title,
        user_id: job.diary.user_id,
        start_date: job.diary.start_date,
        end_date: job.diary.end_date,
        cover_image_url: job.diary.cover_image_url,
        entry_count: entryCountMap.get(job.diary_id) || 0,
      },
      user: userMap.get(job.diary.user_id) || undefined,
    }))

    return NextResponse.json({ jobs: result })
  } catch (error) {
    console.error('Error fetching publish jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

// POST /api/admin/publishing - Create a new publish job
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { diary_id } = body

    if (!diary_id) {
      return NextResponse.json({ error: 'diary_id is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    // Check if diary exists
    const { data: diary, error: diaryError } = await supabase
      .from('diaries')
      .select('id')
      .eq('id', diary_id)
      .single()

    if (diaryError || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 })
    }

    // Check for existing pending/processing job
    const { data: existingJob } = await supabase
      .from('diary_publish_jobs')
      .select('id, status')
      .eq('diary_id', diary_id)
      .in('status', ['pending', 'processing'])
      .maybeSingle()

    if (existingJob) {
      return NextResponse.json(
        { error: 'A job is already pending or processing for this diary' },
        { status: 409 }
      )
    }

    // Create new job
    const { data: job, error: createError } = await supabase
      .from('diary_publish_jobs')
      .insert({
        diary_id,
        admin_user_id: auth.userId,
        status: 'pending',
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Error creating publish job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
