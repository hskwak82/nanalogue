import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

// POST /api/admin/subscriptions/bulk - Bulk grant subscriptions
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userIds, plan, durationDays, reason } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()
    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + (durationDays || 30))

    let successCount = 0
    let failCount = 0

    for (const userId of userIds) {
      // Check if subscription exists
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id, current_period_end')
        .eq('user_id', userId)
        .single()

      let newEndDate = periodEnd

      if (existing) {
        // Extend from current end date if it's in the future
        const currentEnd = new Date(existing.current_period_end || new Date())
        if (currentEnd > new Date()) {
          newEndDate = new Date(currentEnd)
          newEndDate.setDate(newEndDate.getDate() + (durationDays || 30))
        }

        const { error } = await supabase
          .from('subscriptions')
          .update({
            plan: plan || 'pro',
            status: 'active',
            current_period_end: newEndDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        if (error) {
          failCount++
        } else {
          successCount++
        }
      } else {
        const { error } = await supabase.from('subscriptions').insert({
          user_id: userId,
          plan: plan || 'pro',
          status: 'active',
          current_period_end: newEndDate.toISOString(),
        })

        if (error) {
          failCount++
        } else {
          successCount++
        }
      }
    }

    return NextResponse.json({
      message: `${successCount}명에게 구독이 부여되었습니다.${failCount > 0 ? ` (${failCount}명 실패)` : ''}`,
      successCount,
      failCount,
    })
  } catch (error) {
    console.error('Error bulk granting subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to bulk grant subscriptions' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/subscriptions/bulk - Bulk revoke subscriptions
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    // Update all subscriptions to free
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan: 'free',
        status: 'canceled',
        toss_billing_key: null,
        updated_at: new Date().toISOString(),
      })
      .in('user_id', userIds)

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: `${userIds.length}명의 구독이 취소되었습니다.`,
    })
  } catch (error) {
    console.error('Error bulk revoking subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to bulk revoke subscriptions' },
      { status: 500 }
    )
  }
}
