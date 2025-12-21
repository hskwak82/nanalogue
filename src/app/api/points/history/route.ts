import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPointTransactions } from '@/lib/points'

// GET /api/points/history - Get user's point transaction history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const { transactions, total } = await getPointTransactions(user.id, page, limit)

    return NextResponse.json({
      transactions,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('Error fetching point history:', error)
    return NextResponse.json(
      { error: '포인트 내역을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
