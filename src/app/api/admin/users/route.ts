import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

export interface AdminUser {
  id: string
  email: string
  name: string | null
  created_at: string
  plan: string
  status: string
  diary_count: number
  entry_count: number
}

// GET /api/admin/users - Get users list with pagination and search
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
    const planFilter = searchParams.get('plan') || ''

    const offset = (page - 1) * limit
    const supabase = getAdminServiceClient()

    // Build base query for profiles
    let query = supabase
      .from('profiles')
      .select('id, email, name, created_at', { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }

    // Get profiles with pagination
    const { data: profiles, count, error: profilesError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (profilesError) {
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        users: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      })
    }

    // Get subscriptions for these users
    const userIds = profiles.map((p) => p.id)
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, plan, status')
      .in('user_id', userIds)

    // Get diary counts for these users
    const { data: diaryCounts } = await supabase
      .from('diaries')
      .select('user_id')
      .in('user_id', userIds)

    // Create maps for quick lookup
    const subMap = new Map(
      subscriptions?.map((s) => [s.user_id, { plan: s.plan, status: s.status }])
    )

    // Count diaries per user
    const diaryCountMap = new Map<string, number>()
    diaryCounts?.forEach((d) => {
      diaryCountMap.set(d.user_id, (diaryCountMap.get(d.user_id) || 0) + 1)
    })

    // Get entry counts per user
    const entryCountMap = new Map<string, number>()

    // Get diaries with their user_ids and entry counts
    if (userIds.length > 0) {
      const { data: userDiaries } = await supabase
        .from('diaries')
        .select('id, user_id')
        .in('user_id', userIds)

      if (userDiaries && userDiaries.length > 0) {
        const diaryIdList = userDiaries.map(d => d.id)
        const { data: entries } = await supabase
          .from('diary_entries')
          .select('diary_id')
          .in('diary_id', diaryIdList)

        // Map diary_id to user_id
        const diaryToUser = new Map(userDiaries.map(d => [d.id, d.user_id]))

        entries?.forEach((e) => {
          const userId = diaryToUser.get(e.diary_id)
          if (userId) {
            entryCountMap.set(userId, (entryCountMap.get(userId) || 0) + 1)
          }
        })
      }
    }

    // Combine data
    let users: AdminUser[] = profiles.map((p) => ({
      id: p.id,
      email: p.email,
      name: p.name,
      created_at: p.created_at,
      plan: subMap.get(p.id)?.plan || 'free',
      status: subMap.get(p.id)?.status || 'none',
      diary_count: diaryCountMap.get(p.id) || 0,
      entry_count: entryCountMap.get(p.id) || 0,
    }))

    // Apply plan filter if specified
    if (planFilter) {
      users = users.filter((u) => u.plan === planFilter)
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
