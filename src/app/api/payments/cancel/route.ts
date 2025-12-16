import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/payments/cancel - Cancel subscription
export async function POST() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (subscription.plan === 'free') {
      return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 })
    }

    // Cancel subscription - don't delete billing key, just change status
    // User will have access until current_period_end
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error canceling subscription:', updateError)
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '구독이 취소되었습니다. 현재 결제 기간이 끝날 때까지 프리미엄 기능을 사용할 수 있습니다.',
      currentPeriodEnd: subscription.current_period_end,
    })
  } catch (error) {
    console.error('Error in POST /api/payments/cancel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
