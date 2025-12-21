import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { approveBillingPayment, generateOrderId } from '@/lib/toss'
import { getSubscriptionPlan } from '@/lib/premium'
import { getUserPoints, usePointsForPayment } from '@/lib/points'
import { IS_TEST_MODE } from '@/types/payment'

interface SubscribeRequest {
  planId: string
  pointsToUse?: number // Optional: points to use for this payment
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
    const { planId, pointsToUse = 0 } = body

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }

    // Get plan details from database
    const plan = await getSubscriptionPlan(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Validate points to use
    let validatedPointsToUse = 0
    if (pointsToUse > 0) {
      const userPoints = await getUserPoints(user.id)
      if (!userPoints || userPoints.balance < pointsToUse) {
        return NextResponse.json(
          { error: '포인트가 부족합니다.' },
          { status: 400 }
        )
      }
      // Can't use more points than the plan price
      validatedPointsToUse = Math.min(pointsToUse, plan.price)
    }

    // Calculate final amount after points deduction
    const finalAmount = plan.price - validatedPointsToUse

    // Get user's current subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Use service role client to bypass RLS for subscription updates
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Free plan - just update the plan
    if (planId === 'free') {
      const { error: updateError } = await serviceClient
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

    // Pro plan - need billing key if there's an amount to charge
    if (finalAmount > 0 && !subscription.toss_billing_key) {
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

    let paymentKey = null
    let pointsUsed = 0

    // If fully paid with points (final amount is 0)
    if (finalAmount === 0) {
      // Use points
      const pointResult = await usePointsForPayment(user.id, validatedPointsToUse, orderId)
      if (!pointResult.success) {
        return NextResponse.json(
          { error: pointResult.error || '포인트 사용 중 오류가 발생했습니다.' },
          { status: 400 }
        )
      }
      pointsUsed = validatedPointsToUse

      // Record payment in history (0원 결제)
      const { data: paymentRecord } = await serviceClient.from('payment_history').insert({
        user_id: user.id,
        plan_id: planId,
        payment_key: `points_only_${Date.now()}`,
        order_id: orderId,
        amount: 0,
        status: 'DONE',
        paid_at: new Date().toISOString(),
      }).select('id').single()

      paymentKey = `points_only_${Date.now()}`
    } else {
      // In test mode, skip actual payment
      if (IS_TEST_MODE) {
        // Use points first if any
        if (validatedPointsToUse > 0) {
          const pointResult = await usePointsForPayment(user.id, validatedPointsToUse, orderId)
          if (!pointResult.success) {
            return NextResponse.json(
              { error: pointResult.error || '포인트 사용 중 오류가 발생했습니다.' },
              { status: 400 }
            )
          }
          pointsUsed = validatedPointsToUse
        }

        // Record test payment in history
        await serviceClient.from('payment_history').insert({
          user_id: user.id,
          plan_id: planId,
          payment_key: `test_payment_${Date.now()}`,
          order_id: orderId,
          amount: finalAmount,
          status: 'DONE',
          paid_at: new Date().toISOString(),
        })

        paymentKey = `test_payment_${Date.now()}`
      } else {
        // Production: Approve real payment for the remaining amount
        const paymentResponse = await approveBillingPayment(
          subscription.toss_billing_key,
          subscription.toss_customer_key,
          finalAmount,
          orderId,
          orderName
        )

        // Use points after successful payment
        if (validatedPointsToUse > 0) {
          const pointResult = await usePointsForPayment(user.id, validatedPointsToUse, paymentResponse.paymentKey)
          if (!pointResult.success) {
            console.error('Failed to deduct points after payment:', pointResult.error)
            // Payment succeeded but points failed - log but don't fail
          } else {
            pointsUsed = validatedPointsToUse
          }
        }

        // Record payment in history
        await serviceClient.from('payment_history').insert({
          user_id: user.id,
          plan_id: planId,
          payment_key: paymentResponse.paymentKey,
          order_id: orderId,
          amount: finalAmount,
          status: paymentResponse.status,
          paid_at: paymentResponse.approvedAt,
        })

        paymentKey = paymentResponse.paymentKey
      }
    }

    // Update subscription
    const { error: updateError } = await serviceClient
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
      paymentKey,
      pointsUsed,
      amountCharged: finalAmount,
      nextBillingDate: nextBillingDate.toISOString(),
      testMode: IS_TEST_MODE && finalAmount > 0,
    })
  } catch (error) {
    console.error('Error in POST /api/payments/subscribe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
