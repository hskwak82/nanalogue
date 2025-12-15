import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CustomizationSaveRequest, PlacedDecoration } from '@/types/customization'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CustomizationSaveRequest = await request.json()

    // Validate cover_decorations if provided
    if (body.cover_decorations) {
      for (const decoration of body.cover_decorations) {
        if (
          typeof decoration.x !== 'number' ||
          typeof decoration.y !== 'number' ||
          typeof decoration.scale !== 'number' ||
          typeof decoration.rotation !== 'number'
        ) {
          return NextResponse.json(
            { error: 'Invalid decoration data' },
            { status: 400 }
          )
        }
      }
    }

    // Check if user already has customization
    const { data: existing } = await supabase
      .from('diary_customization')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('diary_customization')
        .update({
          cover_template_id: body.cover_template_id,
          paper_template_id: body.paper_template_id,
          cover_decorations: body.cover_decorations || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Error updating customization:', error)
        return NextResponse.json(
          { error: 'Failed to save customization' },
          { status: 500 }
        )
      }
    } else {
      // Insert new
      const { error } = await supabase.from('diary_customization').insert({
        user_id: user.id,
        cover_template_id: body.cover_template_id,
        paper_template_id: body.paper_template_id,
        cover_decorations: body.cover_decorations || [],
      })

      if (error) {
        console.error('Error creating customization:', error)
        return NextResponse.json(
          { error: 'Failed to save customization' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving customization:', error)
    return NextResponse.json(
      { error: 'Failed to save customization' },
      { status: 500 }
    )
  }
}
