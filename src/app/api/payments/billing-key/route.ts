import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { issueBillingKey, getCardCompanyName } from '@/lib/toss'
import { IS_TEST_MODE } from '@/types/payment'

interface BillingKeyRequest {
  authKey: string
  customerKey: string
}

// POST /api/payments/billing-key - Issue billing key from auth key
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

    const body: BillingKeyRequest = await request.json()
    const { authKey, customerKey } = body

    if (!authKey || !customerKey) {
      return NextResponse.json(
        { error: 'authKey and customerKey are required' },
        { status: 400 }
      )
    }

    // In test mode, simulate billing key issuance
    if (IS_TEST_MODE) {
      const testBillingKey = `test_billing_${Date.now()}`

      // Update subscription with test billing key
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          toss_billing_key: testBillingKey,
          toss_customer_key: customerKey,
          card_company: '테스트',
          card_number: '****1234',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating subscription:', updateError)
        return NextResponse.json(
          { error: 'Failed to save billing key' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        testMode: true,
        billingKey: testBillingKey,
        cardCompany: '테스트',
        cardNumber: '****1234',
      })
    }

    // Production: Issue real billing key
    const billingResponse = await issueBillingKey(authKey, customerKey)

    // Update subscription with billing key
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        toss_billing_key: billingResponse.billingKey,
        toss_customer_key: customerKey,
        card_company: getCardCompanyName(billingResponse.card.issuerCode),
        card_number: billingResponse.card.number.slice(-4),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to save billing key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      billingKey: billingResponse.billingKey,
      cardCompany: getCardCompanyName(billingResponse.card.issuerCode),
      cardNumber: billingResponse.card.number.slice(-4),
    })
  } catch (error) {
    console.error('Error in POST /api/payments/billing-key:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
