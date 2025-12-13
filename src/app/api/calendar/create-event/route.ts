import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, isCalendarConnected } from '@/lib/google-calendar'

interface CreateEventRequest {
  title: string
  date: string          // YYYY-MM-DD
  time?: string         // HH:mm (optional)
  duration?: number     // minutes (default: 60)
  description?: string
}

interface CreateEventResponse {
  success: boolean
  event?: {
    id: string
    title: string
    date: string
    time?: string
  }
  error?: string
}

export async function POST(request: Request): Promise<NextResponse<CreateEventResponse>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if calendar is connected
    const connected = await isCalendarConnected(user.id)
    if (!connected) {
      return NextResponse.json(
        { success: false, error: 'Calendar not connected' },
        { status: 400 }
      )
    }

    const body: CreateEventRequest = await request.json()
    const { title, date, time, duration, description } = body

    // Validate required fields
    if (!title || !date) {
      return NextResponse.json(
        { success: false, error: 'Title and date are required' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Validate time format if provided
    if (time) {
      const timeRegex = /^\d{2}:\d{2}$/
      if (!timeRegex.test(time)) {
        return NextResponse.json(
          { success: false, error: 'Invalid time format. Use HH:mm' },
          { status: 400 }
        )
      }
    }

    // Create calendar event
    const result = await createCalendarEvent({
      userId: user.id,
      title,
      date,
      time,
      duration,
      description,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      event: {
        id: result.eventId || '',
        title,
        date,
        time,
      },
    })
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
