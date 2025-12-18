import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface SpineTemplateFromDB {
  id: string
  name: string
  background: string
  top_band_color: string | null
  top_band_height: string | null
  bottom_band_color: string | null
  bottom_band_height: string | null
  text_color: string
  is_free: boolean
  sort_order: number
}

// GET /api/spine-templates - Get active spine templates
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: templates, error } = await supabase
      .from('spine_templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching spine templates:', error)
      // Fallback to empty array if table doesn't exist yet
      return NextResponse.json({ templates: [] })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Error in GET /api/spine-templates:', error)
    return NextResponse.json({ templates: [] })
  }
}
