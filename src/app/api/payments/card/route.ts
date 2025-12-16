import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/payments/card - Remove registered card (billing key)
export async function DELETE() {
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

    // Can't remove card if currently on pro plan with active status
    if (subscription.plan === 'pro' && subscription.status === 'active') {
      return NextResponse.json(
        { error: '프로 플랜 구독 중에는 카드를 삭제할 수 없습니다. 먼저 구독을 취소해주세요.' },
        { status: 400 }
      )
    }

    // Remove billing key and card info
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        toss_billing_key: null,
        toss_customer_key: null,
        card_company: null,
        card_number: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error removing card:', updateError)
      return NextResponse.json({ error: 'Failed to remove card' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '카드가 삭제되었습니다.',
    })
  } catch (error) {
    console.error('Error in DELETE /api/payments/card:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
