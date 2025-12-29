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

    const { entryId, opacity, fontColor, fontSize, textBgOpacity } = await request.json()

    // Validate input
    if (!entryId) {
      return NextResponse.json(
        { error: 'Invalid request: entryId is required' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: {
      session_image_opacity?: number
      session_font_color?: string | null
      session_font_size?: number | null
      session_text_bg_opacity?: number | null
    } = {}

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

    // Validate and add font size if provided
    if (fontSize !== undefined) {
      if (fontSize === null) {
        updateData.session_font_size = null
      } else if (typeof fontSize === 'number') {
        if (fontSize < 0.8 || fontSize > 1.5) {
          return NextResponse.json(
            { error: 'Invalid fontSize: must be between 0.8 and 1.5' },
            { status: 400 }
          )
        }
        updateData.session_font_size = fontSize
      }
    }

    // Validate and add text background opacity if provided
    if (textBgOpacity !== undefined) {
      if (textBgOpacity === null) {
        updateData.session_text_bg_opacity = null
      } else if (typeof textBgOpacity === 'number') {
        if (textBgOpacity < 0 || textBgOpacity > 1) {
          return NextResponse.json(
            { error: 'Invalid textBgOpacity: must be between 0 and 1' },
            { status: 400 }
          )
        }
        updateData.session_text_bg_opacity = textBgOpacity
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
