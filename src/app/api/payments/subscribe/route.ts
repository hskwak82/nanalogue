import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { approveBillingPayment, generateOrderId } from '@/lib/toss'
import { getSubscriptionPlan } from '@/lib/premium'
import { IS_TEST_MODE } from '@/types/payment'

interface SubscribeRequest {
  planId: string
}

// POST /api/payments/subscribe - Subscribe to a plan
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SubscribeRequest = await request.json()
    const { planId } = body

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    // Get plan details from database
    const plan = await getSubscriptionPlan(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Get user's current subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Free plan - just update the plan
    if (planId === 'free') {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan: 'free',
          status: 'active',
          next_billing_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }

      return NextResponse.json({ success: true, plan: 'free' })
    }

    // Pro plan - need billing key
    if (!subscription.toss_billing_key) {
      return NextResponse.json(
        { error: 'Please register a payment method first' },
        { status: 400 }
      )
    }

    const orderId = generateOrderId()
    const orderName = `나날로그 ${plan.name} 구독`

    // Calculate next billing date (1 month from now)
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    // In test mode, skip actual payment
    if (IS_TEST_MODE) {
      // Record test payment in history
      await supabase.from('payment_history').insert({
        user_id: user.id,
        plan_id: planId,
        payment_key: `test_payment_${Date.now()}`,
        order_id: orderId,
        amount: plan.price,
        status: 'DONE',
        paid_at: new Date().toISOString(),
      })

      // Update subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan: planId,
          status: 'active',
          next_billing_date: nextBillingDate.toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: nextBillingDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        testMode: true,
        plan: planId,
        nextBillingDate: nextBillingDate.toISOString(),
      })
    }

    // Production: Approve real payment
    const paymentResponse = await approveBillingPayment(
      subscription.toss_billing_key,
      subscription.toss_customer_key,
      plan.price,
      orderId,
      orderName
    )

    // Record payment in history
    await supabase.from('payment_history').insert({
      user_id: user.id,
      plan_id: planId,
      payment_key: paymentResponse.paymentKey,
      order_id: orderId,
      amount: plan.price,
      status: paymentResponse.status,
      paid_at: paymentResponse.approvedAt,
    })

    // Update subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan: planId,
        status: 'active',
        next_billing_date: nextBillingDate.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: nextBillingDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plan: planId,
      paymentKey: paymentResponse.paymentKey,
      nextBillingDate: nextBillingDate.toISOString(),
    })
  } catch (error) {
    console.error('Error in POST /api/payments/subscribe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
