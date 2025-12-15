import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  CoverTemplate,
  PaperTemplate,
  DecorationItem,
  DiaryCustomization,
  PlacedDecoration,
  CustomizationLoadResponse,
} from '@/types/customization'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all data in parallel
    const [
      profileResult,
      customizationResult,
      coverTemplatesResult,
      paperTemplatesResult,
      decorationItemsResult,
    ] = await Promise.all([
      // User profile
      supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single(),
      // User's customization
      supabase
        .from('diary_customization')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      // Cover templates
      supabase
        .from('cover_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      // Paper templates
      supabase
        .from('paper_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      // Decoration items
      supabase
        .from('decoration_items')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('sort_order'),
    ])

    // Check for errors
    if (coverTemplatesResult.error) {
      console.error('Error fetching cover templates:', coverTemplatesResult.error)
    }
    if (paperTemplatesResult.error) {
      console.error('Error fetching paper templates:', paperTemplatesResult.error)
    }
    if (decorationItemsResult.error) {
      console.error('Error fetching decoration items:', decorationItemsResult.error)
    }

    // Transform customization data
    let customization: DiaryCustomization | null = null
    if (customizationResult.data) {
      customization = {
        ...customizationResult.data,
        cover_decorations: (customizationResult.data.cover_decorations || []) as PlacedDecoration[],
      }
    }

    const response: CustomizationLoadResponse = {
      user: {
        email: user.email || '',
        name: profileResult.data?.name || null,
      },
      customization,
      coverTemplates: (coverTemplatesResult.data || []) as CoverTemplate[],
      paperTemplates: (paperTemplatesResult.data || []) as PaperTemplate[],
      decorationItems: (decorationItemsResult.data || []) as DecorationItem[],
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error loading customization:', error)
    return NextResponse.json(
      { error: 'Failed to load customization' },
      { status: 500 }
    )
  }
}
