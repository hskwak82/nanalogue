import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectCalendar } from '@/lib/google-calendar'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const disconnected = await disconnectCalendar(user.id)

    if (!disconnected) {
      return NextResponse.json(
        { error: 'Failed to disconnect calendar' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting calendar:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect calendar' },
      { status: 500 }
    )
  }
}
