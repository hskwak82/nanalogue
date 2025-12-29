import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entryId, opacity } = await request.json()

    // Validate input
    if (!entryId || typeof opacity !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request: entryId and opacity are required' },
        { status: 400 }
      )
    }

    // Validate opacity range
    if (opacity < 0 || opacity > 1) {
      return NextResponse.json(
        { error: 'Invalid opacity: must be between 0 and 1' },
        { status: 400 }
      )
    }

    // Update the diary entry's session image opacity
    const { error } = await supabase
      .from('diary_entries')
      .update({ session_image_opacity: opacity })
      .eq('id', entryId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating session image opacity:', error)
      return NextResponse.json(
        { error: 'Failed to update opacity' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in session-image-opacity API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
