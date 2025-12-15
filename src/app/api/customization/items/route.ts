import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const supabase = await createClient()

    switch (type) {
      case 'covers': {
        const { data, error } = await supabase
          .from('cover_templates')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')

        if (error) {
          console.error('Error fetching cover templates:', error)
          return NextResponse.json({ error: 'Failed to fetch covers' }, { status: 500 })
        }

        return NextResponse.json({ covers: data })
      }

      case 'papers': {
        const { data, error } = await supabase
          .from('paper_templates')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')

        if (error) {
          console.error('Error fetching paper templates:', error)
          return NextResponse.json({ error: 'Failed to fetch papers' }, { status: 500 })
        }

        return NextResponse.json({ papers: data })
      }

      case 'decorations': {
        const category = searchParams.get('category')

        let query = supabase
          .from('decoration_items')
          .select('*')
          .eq('is_active', true)

        if (category) {
          query = query.eq('category', category)
        }

        const { data, error } = await query.order('category').order('sort_order')

        if (error) {
          console.error('Error fetching decoration items:', error)
          return NextResponse.json({ error: 'Failed to fetch decorations' }, { status: 500 })
        }

        return NextResponse.json({ decorations: data })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: covers, papers, or decorations' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}
