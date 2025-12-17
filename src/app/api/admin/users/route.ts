import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

export interface AdminUser {
  id: string
  email: string
  name: string | null
  created_at: string
  plan: string
  status: string
  subscription_type: 'recurring' | 'manual' | 'none'
  next_billing_date: string | null
  current_period_end: string | null
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
    const subscriptionTypeFilter = searchParams.get('subscriptionType') || ''
    const periodFilter = searchParams.get('period') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const offset = (page - 1) * limit
    const supabase = getAdminServiceClient()

    // Build profiles query
    let query = supabase
      .from('profiles')
      .select('id, email, name, created_at', { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }

    // Apply period filter
    if (periodFilter === 'custom' && startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString())
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        query = query.lte('created_at', endDateTime.toISOString())
      }
    } else if (periodFilter && periodFilter !== 'custom') {
      const now = new Date()
      let filterStartDate: Date

      switch (periodFilter) {
        case 'today':
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          filterStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case '3months':
          filterStartDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
          break
        default:
          filterStartDate = new Date(0)
      }

      query = query.gte('created_at', filterStartDate.toISOString())
    }

    // Get profiles with pagination
    const { data: profiles, count, error: profilesError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        users: [],
        pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
      })
    }

    const userIds = profiles.map((p) => p.id)

    // Run all data fetching in parallel for better performance
    const [subscriptionsResult, diaryCountsResult, userDiariesResult] = await Promise.all([
      // Subscriptions for current page users
      supabase
        .from('subscriptions')
        .select('user_id, plan, status, toss_billing_key, next_billing_date, current_period_end')
        .in('user_id', userIds),

      // Diary counts for current page users
      supabase
        .from('diaries')
        .select('user_id')
        .in('user_id', userIds),

      // Diaries for entry counting
      supabase
        .from('diaries')
        .select('id, user_id')
        .in('user_id', userIds),
    ])

    const subscriptions = subscriptionsResult.data
    const diaryCounts = diaryCountsResult.data
    const userDiaries = userDiariesResult.data

    // Get entry counts if there are diaries
    let entryCountMap = new Map<string, number>()
    if (userDiaries && userDiaries.length > 0) {
      const diaryIds = userDiaries.map(d => d.id)
      const { data: entries } = await supabase
        .from('diary_entries')
        .select('diary_id')
        .in('diary_id', diaryIds)

      const diaryToUser = new Map(userDiaries.map(d => [d.id, d.user_id]))
      entries?.forEach((e) => {
        const userId = diaryToUser.get(e.diary_id)
        if (userId) {
          entryCountMap.set(userId, (entryCountMap.get(userId) || 0) + 1)
        }
      })
    }

    // Create lookup maps
    const subMap = new Map(
      subscriptions?.map((s) => [s.user_id, s]) || []
    )

    const diaryCountMap = new Map<string, number>()
    diaryCounts?.forEach((d) => {
      diaryCountMap.set(d.user_id, (diaryCountMap.get(d.user_id) || 0) + 1)
    })

    // Build user list
    let users: AdminUser[] = profiles.map((p) => {
      const sub = subMap.get(p.id)
      const plan = sub?.plan || 'free'

      let subscriptionType: 'recurring' | 'manual' | 'none' = 'none'
      if (plan === 'pro' && sub) {
        subscriptionType = sub.toss_billing_key ? 'recurring' : 'manual'
      }

      return {
        id: p.id,
        email: p.email,
        name: p.name,
        created_at: p.created_at,
        plan,
        status: sub?.status || 'none',
        subscription_type: subscriptionType,
        next_billing_date: sub?.next_billing_date || null,
        current_period_end: sub?.current_period_end || null,
        diary_count: diaryCountMap.get(p.id) || 0,
        entry_count: entryCountMap.get(p.id) || 0,
      }
    })

    // Apply filters (client-side for simplicity, since data is already paginated)
    if (planFilter) {
      users = users.filter((u) => u.plan === planFilter)
    }
    if (subscriptionTypeFilter) {
      users = users.filter((u) => u.subscription_type === subscriptionTypeFilter)
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
