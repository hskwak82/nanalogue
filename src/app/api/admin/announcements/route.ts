import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'important' | 'event'
  is_active: boolean
  is_popup: boolean
  starts_at: string
  ends_at: string | null
  target_audience: 'all' | 'free' | 'pro'
  created_by: string | null
  created_at: string
  updated_at: string
}

// GET /api/admin/announcements - Get all announcements for admin with pagination and filters
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const typeFilter = searchParams.get('type') || ''
    const targetFilter = searchParams.get('target') || ''
    const activeFilter = searchParams.get('active') || ''
    const offset = (page - 1) * limit

    const supabase = getAdminServiceClient()

    // Build base query for count
    let countQuery = supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })

    // Build base query for data
    let dataQuery = supabase
      .from('announcements')
      .select('*')

    // Apply search filter (title)
    if (search) {
      countQuery = countQuery.ilike('title', `%${search}%`)
      dataQuery = dataQuery.ilike('title', `%${search}%`)
    }

    // Apply type filter
    if (typeFilter) {
      countQuery = countQuery.eq('type', typeFilter)
      dataQuery = dataQuery.eq('type', typeFilter)
    }

    // Apply target audience filter
    if (targetFilter) {
      countQuery = countQuery.eq('target_audience', targetFilter)
      dataQuery = dataQuery.eq('target_audience', targetFilter)
    }

    // Apply active filter
    if (activeFilter) {
      const isActive = activeFilter === 'true'
      countQuery = countQuery.eq('is_active', isActive)
      dataQuery = dataQuery.eq('is_active', isActive)
    }

    // Get total count
    const { count } = await countQuery

    // Get paginated announcements
    const { data: announcements, error } = await dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

// POST /api/admin/announcements - Create new announcement
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, content, type, is_popup, starts_at, ends_at, target_audience } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        type: type || 'info',
        is_popup: is_popup || false,
        starts_at: starts_at || new Date().toISOString(),
        ends_at: ends_at || null,
        target_audience: target_audience || 'all',
        created_by: auth.userId,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}

// PATCH /api/admin/announcements - Update announcement
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

    const { data: announcement, error } = await supabase
      .from('announcements')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error('Error updating announcement:', error)
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
  }
}

// DELETE /api/admin/announcements - Delete announcement
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

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}
