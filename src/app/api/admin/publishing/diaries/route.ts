import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import type { PublishableDiary } from '@/types/publishing'

// GET /api/admin/publishing/diaries - Get publishable diaries
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || ''
    const offset = (page - 1) * limit

    const supabase = getAdminServiceClient()

    // Build query for diaries
    let query = supabase
      .from('diaries')
      .select('id, user_id, volume_number, title, status, start_date, end_date, cover_image_url', {
        count: 'exact',
      })

    // Apply status filter
    if (statusFilter === 'completed') {
      query = query.eq('status', 'completed')
    } else if (statusFilter === 'active') {
      query = query.eq('status', 'active')
    }

    // Get all diaries first for search (we need user info)
    const { data: allDiaries, count, error: diariesError } = await query
      .order('created_at', { ascending: false })

    if (diariesError) throw diariesError

    if (!allDiaries || allDiaries.length === 0) {
      return NextResponse.json({
        diaries: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    // Get user info
    const userIds = [...new Set(allDiaries.map((d) => d.user_id))]
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('id', userIds)

    const userMap = new Map(users?.map((u) => [u.id, u]))

    // Filter by search (user email/name or diary title)
    let filteredDiaries = allDiaries
    if (search) {
      const searchLower = search.toLowerCase()
      filteredDiaries = allDiaries.filter((d) => {
        const user = userMap.get(d.user_id)
        return (
          d.title?.toLowerCase().includes(searchLower) ||
          user?.email?.toLowerCase().includes(searchLower) ||
          user?.name?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Apply pagination
    const paginatedDiaries = filteredDiaries.slice(offset, offset + limit)

    // Get entry counts
    const diaryIds = paginatedDiaries.map((d) => d.id)
    const { data: entryCounts } = await supabase
      .from('diary_entries')
      .select('diary_id')
      .in('diary_id', diaryIds)

    const entryCountMap = new Map<string, number>()
    entryCounts?.forEach((e) => {
      const count = entryCountMap.get(e.diary_id) || 0
      entryCountMap.set(e.diary_id, count + 1)
    })

    // Get existing publish jobs for these diaries
    const { data: existingJobs } = await supabase
      .from('diary_publish_jobs')
      .select('*')
      .in('diary_id', diaryIds)
      .order('created_at', { ascending: false })

    // Get the most recent job for each diary
    type JobType = NonNullable<typeof existingJobs>[number]
    const jobMap = new Map<string, JobType>()
    existingJobs?.forEach((job) => {
      if (!jobMap.has(job.diary_id)) {
        jobMap.set(job.diary_id, job)
      }
    })

    // Transform to response format
    const result: PublishableDiary[] = paginatedDiaries.map((diary) => ({
      id: diary.id,
      user_id: diary.user_id,
      volume_number: diary.volume_number,
      title: diary.title,
      status: diary.status,
      start_date: diary.start_date,
      end_date: diary.end_date,
      cover_image_url: diary.cover_image_url,
      entry_count: entryCountMap.get(diary.id) || 0,
      user: userMap.get(diary.user_id) || { id: diary.user_id, email: 'unknown', name: null },
      existing_job: jobMap.get(diary.id) || null,
    }))

    return NextResponse.json({
      diaries: result,
      pagination: {
        page,
        limit,
        total: filteredDiaries.length,
        totalPages: Math.ceil(filteredDiaries.length / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching publishable diaries:', error)
    return NextResponse.json({ error: 'Failed to fetch diaries' }, { status: 500 })
  }
}
