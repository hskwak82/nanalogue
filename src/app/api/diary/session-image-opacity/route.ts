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

    const { entryId, opacity, fontColor } = await request.json()

    // Validate input
    if (!entryId) {
      return NextResponse.json(
        { error: 'Invalid request: entryId is required' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: { session_image_opacity?: number; session_font_color?: string | null } = {}

    // Validate and add opacity if provided
    if (typeof opacity === 'number') {
      if (opacity < 0 || opacity > 1) {
        return NextResponse.json(
          { error: 'Invalid opacity: must be between 0 and 1' },
          { status: 400 }
        )
      }
      updateData.session_image_opacity = opacity
    }

    // Validate and add font color if provided
    if (fontColor !== undefined) {
      if (fontColor !== null && typeof fontColor === 'string') {
        // Validate hex color format
        if (!/^#[0-9A-Fa-f]{6}$/.test(fontColor)) {
          return NextResponse.json(
            { error: 'Invalid fontColor: must be hex format like #333333' },
            { status: 400 }
          )
        }
        updateData.session_font_color = fontColor
      } else if (fontColor === null) {
        updateData.session_font_color = null
      }
    }

    // Ensure at least one field to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update the diary entry
    const { error } = await supabase
      .from('diary_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating session style:', error)
      return NextResponse.json(
        { error: 'Failed to update style' },
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
