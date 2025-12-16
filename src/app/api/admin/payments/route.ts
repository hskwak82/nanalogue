import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

export interface AdminPayment {
  id: string
  user_id: string
  user_email: string
  user_name: string | null
  plan_id: string
  payment_key: string | null
  order_id: string
  amount: number
  status: string
  failure_reason: string | null
  paid_at: string | null
  created_at: string
}

// GET /api/admin/payments - Get payments list with pagination and filters
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const period = searchParams.get('period') || ''

    const offset = (page - 1) * limit
    const supabase = getAdminServiceClient()

    // Build base query
    let query = supabase
      .from('payment_history')
      .select('*', { count: 'exact' })

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply period filter
    if (period) {
      const now = new Date()
      let startDate: Date

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte('created_at', startDate.toISOString())
    }

    // Get payments with pagination
    const { data: payments, count, error: paymentsError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (paymentsError) {
      throw paymentsError
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        payments: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
        summary: {
          totalAmount: 0,
          doneCount: 0,
          canceledCount: 0,
          failedCount: 0,
        },
      })
    }

    // Get user info for these payments
    const userIds = [...new Set(payments.map((p) => p.user_id))]
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('id', userIds)

    const userMap = new Map(users?.map((u) => [u.id, { email: u.email, name: u.name }]))

    // Format payments with user info
    const formattedPayments: AdminPayment[] = payments.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      user_email: userMap.get(p.user_id)?.email || 'Unknown',
      user_name: userMap.get(p.user_id)?.name || null,
      plan_id: p.plan_id,
      payment_key: p.payment_key,
      order_id: p.order_id,
      amount: p.amount,
      status: p.status,
      failure_reason: p.failure_reason,
      paid_at: p.paid_at,
      created_at: p.created_at,
    }))

    // Calculate summary stats for filtered results
    const totalAmount = formattedPayments
      .filter((p) => p.status === 'DONE')
      .reduce((sum, p) => sum + p.amount, 0)

    const doneCount = formattedPayments.filter((p) => p.status === 'DONE').length
    const canceledCount = formattedPayments.filter((p) => p.status === 'CANCELED').length
    const failedCount = formattedPayments.filter((p) => p.status === 'FAILED').length

    return NextResponse.json({
      payments: formattedPayments,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary: {
        totalAmount,
        doneCount,
        canceledCount,
        failedCount,
      },
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
