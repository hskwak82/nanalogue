import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

export interface AdminStats {
  users: {
    total: number
    today: number
    thisWeek: number
    thisMonth: number
  }
  subscriptions: {
    active: number
    canceled: number
    free: number
  }
  revenue: {
    today: number
    thisWeek: number
    thisMonth: number
    total: number
  }
  activity: {
    totalDiaries: number
    totalEntries: number
  }
  recentUsers: Array<{
    id: string
    email: string
    name: string | null
    created_at: string
  }>
  recentPayments: Array<{
    id: string
    amount: number
    status: string
    paid_at: string
    user_email: string
  }>
}

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET() {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getAdminServiceClient()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Fetch all stats in parallel
    const [
      totalUsersResult,
      todayUsersResult,
      weekUsersResult,
      monthUsersResult,
      activeSubsResult,
      canceledSubsResult,
      freeSubsResult,
      todayRevenueResult,
      weekRevenueResult,
      monthRevenueResult,
      totalRevenueResult,
      totalDiariesResult,
      totalEntriesResult,
      recentUsersResult,
      recentPaymentsResult,
    ] = await Promise.all([
      // User stats
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),

      // Subscription stats
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'pro').eq('status', 'active'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'canceled'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'free'),

      // Revenue stats
      supabase.from('payment_history').select('amount').eq('status', 'DONE').gte('paid_at', todayStart),
      supabase.from('payment_history').select('amount').eq('status', 'DONE').gte('paid_at', weekStart),
      supabase.from('payment_history').select('amount').eq('status', 'DONE').gte('paid_at', monthStart),
      supabase.from('payment_history').select('amount').eq('status', 'DONE'),

      // Activity stats
      supabase.from('diaries').select('id', { count: 'exact', head: true }),
      supabase.from('diary_entries').select('id', { count: 'exact', head: true }),

      // Recent users (last 5)
      supabase.from('profiles').select('id, email, name, created_at').order('created_at', { ascending: false }).limit(5),

      // Recent payments (last 5)
      supabase.from('payment_history').select('id, amount, status, paid_at, user_id').eq('status', 'DONE').order('paid_at', { ascending: false }).limit(5),
    ])

    // Calculate revenue sums
    const sumRevenue = (data: { amount: number }[] | null) =>
      data?.reduce((sum, p) => sum + p.amount, 0) || 0

    // Get user emails for recent payments
    const recentPayments = recentPaymentsResult.data || []
    const userIds = recentPayments.map((p) => p.user_id)
    const { data: paymentUsers } = userIds.length > 0
      ? await supabase.from('profiles').select('id, email').in('id', userIds)
      : { data: [] }

    const userEmailMap = new Map(paymentUsers?.map((u) => [u.id, u.email]) || [])

    const stats: AdminStats = {
      users: {
        total: totalUsersResult.count || 0,
        today: todayUsersResult.count || 0,
        thisWeek: weekUsersResult.count || 0,
        thisMonth: monthUsersResult.count || 0,
      },
      subscriptions: {
        active: activeSubsResult.count || 0,
        canceled: canceledSubsResult.count || 0,
        free: freeSubsResult.count || 0,
      },
      revenue: {
        today: sumRevenue(todayRevenueResult.data),
        thisWeek: sumRevenue(weekRevenueResult.data),
        thisMonth: sumRevenue(monthRevenueResult.data),
        total: sumRevenue(totalRevenueResult.data),
      },
      activity: {
        totalDiaries: totalDiariesResult.count || 0,
        totalEntries: totalEntriesResult.count || 0,
      },
      recentUsers: (recentUsersResult.data || []).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        created_at: u.created_at,
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        paid_at: p.paid_at,
        user_email: userEmailMap.get(p.user_id) || 'Unknown',
      })),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
