import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/announcements - Get active announcements for current user
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get user's subscription plan
    let userPlan = 'free'
    if (user) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single()

      userPlan = subscription?.plan || 'free'
    }

    // Get active announcements
    const now = new Date().toISOString()
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .in('target_audience', ['all', userPlan])
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get which announcements the user has already read
    let readIds: string[] = []
    if (user) {
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)

      readIds = reads?.map((r) => r.announcement_id) || []
    }

    // Mark announcements as read/unread
    const announcementsWithReadStatus = announcements?.map((a) => ({
      ...a,
      is_read: readIds.includes(a.id),
    }))

    return NextResponse.json({
      announcements: announcementsWithReadStatus,
      unreadCount: announcementsWithReadStatus?.filter((a) => !a.is_read).length || 0,
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

// POST /api/announcements - Mark announcement as read
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { announcementId } = body

    if (!announcementId) {
      return NextResponse.json({ error: 'announcementId is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('announcement_reads')
      .upsert(
        {
          user_id: user.id,
          announcement_id: announcementId,
        },
        {
          onConflict: 'user_id,announcement_id',
        }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking announcement as read:', error)
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}
