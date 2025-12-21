import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

// GET /api/admin/points/users - Get users with their point balances
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminAuth()
    if (!auth) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'balance'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit
    const supabase = getAdminServiceClient()

    // Build query
    let query = supabase
      .from('user_points')
      .select(`
        *,
        profiles:user_id (
          email,
          name
        )
      `, { count: 'exact' })

    // Apply sorting
    if (sortBy === 'balance') {
      query = query.order('balance', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'streak') {
      query = query.order('current_streak', { ascending: sortOrder === 'asc' })
    } else if (sortBy === 'earned') {
      query = query.order('total_earned', { ascending: sortOrder === 'asc' })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: '사용자 목록을 가져오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // Filter by search if provided (client-side filtering for now)
    let filteredData = data || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((item: any) => {
        const profile = item.profiles
        if (!profile) return false
        return (
          profile.email?.toLowerCase().includes(searchLower) ||
          profile.name?.toLowerCase().includes(searchLower)
        )
      })
    }

    // Format response
    const users = filteredData.map((item: any) => ({
      user_id: item.user_id,
      email: item.profiles?.email || '',
      name: item.profiles?.name || '',
      balance: item.balance,
      total_earned: item.total_earned,
      total_spent: item.total_spent,
      current_streak: item.current_streak,
      longest_streak: item.longest_streak,
      last_diary_date: item.last_diary_date,
    }))

    return NextResponse.json({
      users,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error fetching users with points:', error)
    return NextResponse.json(
      { error: '사용자 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
