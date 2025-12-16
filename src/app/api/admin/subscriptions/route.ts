import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

// POST /api/admin/subscriptions - Grant subscription to user
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId, plan, durationDays, reason } = body

    if (!userId || !plan) {
      return NextResponse.json({ error: 'userId and plan are required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    // Calculate period
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + (durationDays || 30))

    // Check if subscription exists
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    let result
    if (!existingSub) {
      // Create new subscription
      result = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single()
    } else {
      // Update existing subscription
      result = await supabase
        .from('subscriptions')
        .update({
          plan,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()
    }

    if (result.error) throw result.error

    // Log admin action (ignore if table doesn't exist)
    try {
      await supabase.from('admin_actions_log').insert({
        admin_id: auth.userId,
        action: 'grant_subscription',
        target_user_id: userId,
        details: { plan, durationDays, reason },
      })
    } catch {
      // Log table might not exist, ignore error
    }

    return NextResponse.json({
      success: true,
      subscription: result.data,
      message: `${plan} 플랜이 ${durationDays || 30}일간 부여되었습니다.`,
    })
  } catch (error) {
    console.error('Error granting subscription:', error)
    return NextResponse.json({ error: 'Failed to grant subscription' }, { status: 500 })
  }
}

// PATCH /api/admin/subscriptions - Update subscription (extend/modify)
export async function PATCH(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { userId, extendDays, newEndDate, status } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    // Get current subscription
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!currentSub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    // Extend subscription
    if (extendDays) {
      const currentEnd = new Date(currentSub.current_period_end || new Date())
      currentEnd.setDate(currentEnd.getDate() + extendDays)
      updateData.current_period_end = currentEnd.toISOString()
    }

    // Set specific end date
    if (newEndDate) {
      updateData.current_period_end = new Date(newEndDate).toISOString()
    }

    // Update status
    if (status) {
      updateData.status = status
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}

// DELETE /api/admin/subscriptions - Revoke subscription (set to free)
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    // Set plan to free
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) throw error

    // Log admin action (ignore if table doesn't exist)
    try {
      await supabase.from('admin_actions_log').insert({
        admin_id: auth.userId,
        action: 'revoke_subscription',
        target_user_id: userId,
      })
    } catch {
      // Log table might not exist, ignore error
    }

    return NextResponse.json({ success: true, message: '구독이 취소되었습니다.' })
  } catch (error) {
    console.error('Error revoking subscription:', error)
    return NextResponse.json({ error: 'Failed to revoke subscription' }, { status: 500 })
  }
}
