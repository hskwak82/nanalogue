import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface PublicAnnouncement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'important' | 'event'
  is_popup: boolean
  starts_at: string
  ends_at: string | null
  target_audience: 'all' | 'free' | 'pro'
  created_at: string
}

// GET /api/announcements - Get active announcements for users
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const popupOnly = searchParams.get('popup') === 'true'
    const offset = (page - 1) * limit

    const supabase = await createClient()
    const now = new Date().toISOString()

    // Get current user's plan
    const { data: { user } } = await supabase.auth.getUser()
    let userPlan = 'free'

    if (user) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single()

      userPlan = subscription?.plan || 'free'
    }

    // Get total count
    let countQuery = supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .or(`target_audience.eq.all,target_audience.eq.${userPlan}`)

    if (popupOnly) {
      countQuery = countQuery.eq('is_popup', true)
    }
    const { count } = await countQuery

    // Get paginated announcements
    let dataQuery = supabase
      .from('announcements')
      .select('id, title, content, type, is_popup, starts_at, ends_at, target_audience, created_at')
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .or(`target_audience.eq.all,target_audience.eq.${userPlan}`)

    if (popupOnly) {
      dataQuery = dataQuery.eq('is_popup', true)
    }

    const { data: announcements, error } = await dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      announcements: announcements || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}
