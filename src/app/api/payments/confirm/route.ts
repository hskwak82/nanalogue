import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// GET /api/payments/confirm - Handle one-time payment confirmation
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paymentKey = searchParams.get('paymentKey')
  const orderId = searchParams.get('orderId')
  const amount = searchParams.get('amount')
  const customerKey = searchParams.get('customerKey')

  const errorRedirect = '/settings?payment_error=true'
  const successRedirect = '/settings?payment_success=true'

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(new URL(errorRedirect + '&message=missing_params', request.url))
  }

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Confirm payment with Toss API
    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.redirect(new URL(errorRedirect + '&message=server_config_error', request.url))
    }

    const confirmResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: parseInt(amount),
      }),
    })

    const paymentData = await confirmResponse.json()

    if (!confirmResponse.ok) {
      console.error('Payment confirmation failed:', paymentData)
      return NextResponse.redirect(
        new URL(errorRedirect + '&message=' + encodeURIComponent(paymentData.message || 'confirm_failed'), request.url)
      )
    }

    // Calculate subscription period (1 month)
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    // Use service role client to bypass RLS for admin operations
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Record payment in history
    await serviceClient.from('payment_history').insert({
      user_id: user.id,
      plan_id: 'pro',
      payment_key: paymentKey,
      order_id: orderId,
      amount: parseInt(amount),
      status: 'DONE',
      paid_at: new Date().toISOString(),
    })

    // Check if subscription exists
    const { data: existingSub } = await serviceClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let updateError
    if (!existingSub) {
      // Create new subscription
      const { error } = await serviceClient
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan: 'pro',
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
      updateError = error
    } else {
      // Update existing subscription
      const { error } = await serviceClient
        .from('subscriptions')
        .update({
          plan: 'pro',
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', user.id)
      updateError = error
    }

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.redirect(new URL(errorRedirect + '&message=db_error', request.url))
    }

    return NextResponse.redirect(new URL(successRedirect + '&type=payment', request.url))
  } catch (error) {
    console.error('Error in payment confirm:', error)
    return NextResponse.redirect(
      new URL(errorRedirect + '&message=' + encodeURIComponent(
        error instanceof Error ? error.message : 'unknown_error'
      ), request.url)
    )
  }
}
