import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

export interface MonthlyUserData {
  month: string      // YYYY-MM format
  label: string      // Display label (e.g., "12월")
  free: number
  pro: number
  total: number
}

export interface MonthlyRevenueData {
  month: string
  label: string
  revenue: number
}

export interface MonthlyStatsResponse {
  monthlyUsers: MonthlyUserData[]
  monthlyRevenue: MonthlyRevenueData[]
}

// GET /api/admin/stats/monthly - Get monthly statistics for charts
export async function GET(request: NextRequest) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getAdminServiceClient()
    const searchParams = request.nextUrl.searchParams
    const months = parseInt(searchParams.get('months') || '6', 10)

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    const startDateStr = startDate.toISOString()

    // Generate month labels for the period
    const monthLabels: { month: string; label: string; start: Date; end: Date }[] = []
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = `${date.getMonth() + 1}월`
      monthLabels.push({ month: monthStr, label, start: date, end: nextMonth })
    }

    // Fetch user data with subscription info
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, created_at')
      .gte('created_at', startDateStr)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    // Fetch subscription data for these users
    const userIds = users?.map(u => u.id) || []
    const { data: subscriptions } = userIds.length > 0
      ? await supabase
          .from('subscriptions')
          .select('user_id, plan')
          .in('user_id', userIds)
      : { data: [] }

    // Create a map of user_id to plan
    const userPlanMap = new Map<string, string>()
    subscriptions?.forEach(sub => {
      userPlanMap.set(sub.user_id, sub.plan)
    })

    // Aggregate user data by month
    const monthlyUsers: MonthlyUserData[] = monthLabels.map(({ month, label, start, end }) => {
      let free = 0
      let pro = 0

      users?.forEach(user => {
        const createdAt = new Date(user.created_at)
        if (createdAt >= start && createdAt < end) {
          const plan = userPlanMap.get(user.id) || 'free'
          if (plan === 'pro') {
            pro++
          } else {
            free++
          }
        }
      })

      return { month, label, free, pro, total: free + pro }
    })

    // Fetch payment data
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_history')
      .select('amount, paid_at')
      .eq('status', 'DONE')
      .gte('paid_at', startDateStr)

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      throw paymentsError
    }

    // Aggregate revenue by month
    const monthlyRevenue: MonthlyRevenueData[] = monthLabels.map(({ month, label, start, end }) => {
      let revenue = 0

      payments?.forEach(payment => {
        const paidAt = new Date(payment.paid_at)
        if (paidAt >= start && paidAt < end) {
          revenue += payment.amount
        }
      })

      return { month, label, revenue }
    })

    const response: MonthlyStatsResponse = {
      monthlyUsers,
      monthlyRevenue,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monthly stats' },
      { status: 500 }
    )
  }
}
