import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPointsResponse } from '@/lib/points'

// GET /api/points - Get current user's points
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const pointsData = await getPointsResponse(user.id)
    return NextResponse.json(pointsData)
  } catch (error) {
    console.error('Error fetching points:', error)
    return NextResponse.json(
      { error: '포인트 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
