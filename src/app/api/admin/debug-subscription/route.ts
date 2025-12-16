import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// GET /api/admin/debug-subscription - Debug subscription status
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    // Check with regular client
    const { data: subRegular, error: errorRegular } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Check with service client
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subService, error: errorService } = await serviceClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Try to update with service client
    const testUpdate = await serviceClient
      .from('subscriptions')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()

    return NextResponse.json({
      user_id: user.id,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      regularClient: {
        data: subRegular,
        error: errorRegular?.message,
      },
      serviceClient: {
        data: subService,
        error: errorService?.message,
      },
      testUpdate: {
        data: testUpdate.data,
        error: testUpdate.error?.message,
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create subscription if not exists, then update to pro
export async function POST(request: Request) {
  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user_id from query or auth
    const { searchParams } = new URL(request.url)
    let userId = searchParams.get('user_id')

    if (!userId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Not logged in and no user_id provided' }, { status: 401 })
      }
      userId = user.id
    }

    // Check if subscription exists
    const { data: existing } = await serviceClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    let result
    if (!existing) {
      // Create new subscription
      result = await serviceClient
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: 'pro',
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
    } else {
      // Update existing
      result = await serviceClient
        .from('subscriptions')
        .update({
          plan: 'pro',
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', userId)
        .select()
    }

    return NextResponse.json({
      success: !result.error,
      action: existing ? 'updated' : 'created',
      data: result.data,
      error: result.error?.message,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
