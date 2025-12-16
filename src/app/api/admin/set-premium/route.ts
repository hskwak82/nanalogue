import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/admin/set-premium - Set some items as premium for testing
// WARNING: This endpoint should be removed or protected in production
export async function POST() {
  try {
    // Use service role key to bypass RLS for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results: string[] = []

    // Set last 2 cover templates as premium
    const { data: covers } = await supabase
      .from('cover_templates')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: false })
      .limit(3)

    if (covers && covers.length > 0) {
      const coverIds = covers.map(c => c.id)
      await supabase
        .from('cover_templates')
        .update({ is_free: false })
        .in('id', coverIds)
      results.push(`표지 ${covers.length}개 프리미엄으로 설정: ${covers.map(c => c.name).join(', ')}`)
    }

    // Set last 2 paper templates as premium
    const { data: papers } = await supabase
      .from('paper_templates')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: false })
      .limit(2)

    if (papers && papers.length > 0) {
      const paperIds = papers.map(p => p.id)
      await supabase
        .from('paper_templates')
        .update({ is_free: false })
        .in('id', paperIds)
      results.push(`속지 ${papers.length}개 프리미엄으로 설정: ${papers.map(p => p.name).join(', ')}`)
    }

    // Set 5 random decoration items per category as premium
    const categories = ['nature', 'hearts', 'stars', 'animals', 'food']
    for (const category of categories) {
      const { data: items } = await supabase
        .from('decoration_items')
        .select('id, name')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order', { ascending: false })
        .limit(3)

      if (items && items.length > 0) {
        const itemIds = items.map(i => i.id)
        await supabase
          .from('decoration_items')
          .update({ is_free: false })
          .in('id', itemIds)
        results.push(`${category} 아이템 ${items.length}개 프리미엄으로 설정`)
      }
    }

    return NextResponse.json({
      success: true,
      message: '프리미엄 아이템이 설정되었습니다.',
      results,
    })
  } catch (error) {
    console.error('Error setting premium items:', error)
    return NextResponse.json(
      { error: 'Failed to set premium items' },
      { status: 500 }
    )
  }
}
