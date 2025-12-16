import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/admin/check-premium - Check premium status of items
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: covers } = await supabase
      .from('cover_templates')
      .select('name, is_free')
      .eq('is_active', true)
      .order('sort_order')

    const { data: papers } = await supabase
      .from('paper_templates')
      .select('name, is_free')
      .eq('is_active', true)
      .order('sort_order')

    const { data: items } = await supabase
      .from('decoration_items')
      .select('name, category, is_free')
      .eq('is_active', true)
      .eq('is_free', false)
      .limit(20)

    return NextResponse.json({
      coverTemplates: covers,
      paperTemplates: papers,
      premiumItems: items,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
