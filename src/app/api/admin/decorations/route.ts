import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

// GET /api/admin/decorations - Get all decoration items
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const supabase = getAdminServiceClient()

    let query = supabase
      .from('decoration_items')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: items, error } = await query

    if (error) throw error

    // Get unique categories
    const { data: categories } = await supabase
      .from('decoration_items')
      .select('category')
      .order('category')

    const uniqueCategories = [...new Set(categories?.map(c => c.category) || [])]

    return NextResponse.json({ items, categories: uniqueCategories })
  } catch (error) {
    console.error('Error fetching decorations:', error)
    return NextResponse.json({ error: 'Failed to fetch decorations' }, { status: 500 })
  }
}

// POST /api/admin/decorations - Create new decoration item
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, item_type, content, category, is_free, sort_order } = body

    if (!name || !item_type || !content) {
      return NextResponse.json({ error: 'name, item_type, and content are required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    const { data: item, error } = await supabase
      .from('decoration_items')
      .insert({
        name,
        item_type,
        content,
        category: category || 'general',
        is_free: is_free ?? true,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error creating decoration:', error)
    return NextResponse.json({ error: 'Failed to create decoration' }, { status: 500 })
  }
}

// PATCH /api/admin/decorations - Update decoration item
export async function PATCH(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    const { data: item, error } = await supabase
      .from('decoration_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error updating decoration:', error)
    return NextResponse.json({ error: 'Failed to update decoration' }, { status: 500 })
  }
}

// DELETE /api/admin/decorations - Delete decoration (soft delete)
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    // Soft delete
    const { error } = await supabase
      .from('decoration_items')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting decoration:', error)
    return NextResponse.json({ error: 'Failed to delete decoration' }, { status: 500 })
  }
}

// Bulk update for toggling premium status
export async function PUT(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { ids, is_free } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    if (typeof is_free !== 'boolean') {
      return NextResponse.json({ error: 'is_free boolean is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    const { error } = await supabase
      .from('decoration_items')
      .update({ is_free })
      .in('id', ids)

    if (error) throw error

    return NextResponse.json({ success: true, updated: ids.length })
  } catch (error) {
    console.error('Error bulk updating decorations:', error)
    return NextResponse.json({ error: 'Failed to bulk update decorations' }, { status: 500 })
  }
}
