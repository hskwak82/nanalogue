import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMonthEvents } from '@/lib/google-calendar'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || new Date().getMonth().toString())

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await getMonthEvents(user.id, year, month)

    // Handle different status cases
    if (result.status === 'not_connected') {
      return NextResponse.json({ events: [], connected: false })
    }

    if (result.status === 'needs_reconnection') {
      return NextResponse.json({
        events: [],
        connected: false,
        needsReconnection: true,
        error: 'Calendar connection expired. Please reconnect.',
      })
    }

    if (result.status === 'error') {
      return NextResponse.json({
        events: [],
        error: 'Failed to fetch calendar events',
      })
    }

    return NextResponse.json({ events: result.events, connected: true })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}
