import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import { adminGrantPoints, adminDeductPoints } from '@/lib/points'

// POST /api/admin/points/grant - Grant or deduct points for a user
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth()
    if (!auth) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, amount, action, description } = body as {
      user_id: string
      amount: number
      action: 'grant' | 'deduct'
      description?: string
    }

    if (!user_id || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: '사용자 ID와 포인트 수량이 필요합니다.' },
        { status: 400 }
      )
    }

    if (action !== 'grant' && action !== 'deduct') {
      return NextResponse.json(
        { error: 'action은 grant 또는 deduct여야 합니다.' },
        { status: 400 }
      )
    }

    let result
    if (action === 'grant') {
      result = await adminGrantPoints(user_id, amount, auth.userId, description)
    } else {
      result = await adminDeductPoints(user_id, amount, auth.userId, description)
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '포인트 처리 중 오류가 발생했습니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      new_balance: result.new_balance,
      action,
      amount,
    })
  } catch (error) {
    console.error('Error granting/deducting points:', error)
    return NextResponse.json(
      { error: '포인트 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
