import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { issueBillingKey, getCardCompanyName } from '@/lib/toss'

// GET /api/payments/billing-callback - Handle Toss billing auth callback
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const authKey = searchParams.get('authKey')
  const customerKey = searchParams.get('customerKey')

  // Redirect URL for errors
  const errorRedirect = '/settings?payment_error=true'
  const successRedirect = '/settings?payment_success=true'

  if (!authKey || !customerKey) {
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

    // Check if test mode (test keys start with 'test_')
    const isTestMode = authKey.startsWith('test_') || process.env.TOSS_SECRET_KEY?.startsWith('test_')

    let billingKey: string
    let cardCompany: string
    let cardNumber: string

    if (isTestMode) {
      // Test mode: generate dummy billing key
      billingKey = `test_billing_${Date.now()}`
      cardCompany = '테스트카드'
      cardNumber = '****1234'
    } else {
      // Production: Issue real billing key from Toss
      const billingResponse = await issueBillingKey(authKey, customerKey)
      billingKey = billingResponse.billingKey
      cardCompany = getCardCompanyName(billingResponse.card.issuerCode)
      cardNumber = billingResponse.card.number.slice(-4)
    }

    // Use service role client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update subscription with billing key
    const { error: updateError } = await serviceClient
      .from('subscriptions')
      .update({
        toss_billing_key: billingKey,
        toss_customer_key: customerKey,
        card_company: cardCompany,
        card_number: cardNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.redirect(new URL(errorRedirect + '&message=db_error', request.url))
    }

    // Redirect back to settings with success
    return NextResponse.redirect(new URL(successRedirect, request.url))
  } catch (error) {
    console.error('Error in billing callback:', error)
    return NextResponse.redirect(
      new URL(errorRedirect + '&message=' + encodeURIComponent(
        error instanceof Error ? error.message : 'unknown_error'
      ), request.url)
    )
  }
}
