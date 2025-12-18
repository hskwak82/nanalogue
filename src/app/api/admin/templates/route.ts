import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

type TemplateType = 'cover' | 'paper' | 'spine'

function getTableName(type: string): string {
  switch (type) {
    case 'paper':
      return 'paper_templates'
    case 'spine':
      return 'spine_templates'
    default:
      return 'cover_templates'
  }
}

function isValidType(type: string): type is TemplateType {
  return ['cover', 'paper', 'spine'].includes(type)
}

// GET /api/admin/templates - Get all templates (covers, papers, and spines)
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'cover'

    if (!isValidType(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()
    const tableName = getTableName(type)

    const { data: templates, error } = await supabase
      .from(tableName)
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST /api/admin/templates - Create new template
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, ...templateData } = body

    if (!type || !isValidType(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()
    const tableName = getTableName(type)

    const { data: template, error } = await supabase
      .from(tableName)
      .insert(templateData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

// PATCH /api/admin/templates - Update template
export async function PATCH(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, type, ...updateData } = body

    if (!id || !type) {
      return NextResponse.json({ error: 'id and type are required' }, { status: 400 })
    }

    if (!isValidType(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()
    const tableName = getTableName(type)

    const { data: template, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE /api/admin/templates - Delete template (soft delete by setting is_active = false)
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ error: 'id and type are required' }, { status: 400 })
    }

    if (!isValidType(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()
    const tableName = getTableName(type)

    // Soft delete
    const { error } = await supabase
      .from(tableName)
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
