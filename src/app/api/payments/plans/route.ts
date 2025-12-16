import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SubscriptionPlan } from '@/types/payment'

// GET /api/payments/plans - Get all active subscription plans
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) {
      console.error('Error fetching plans:', error)
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }

    return NextResponse.json({ plans: plans as SubscriptionPlan[] })
  } catch (error) {
    console.error('Error in GET /api/payments/plans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
