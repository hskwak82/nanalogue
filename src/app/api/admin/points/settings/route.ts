import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import { getPointSettings, updatePointSetting } from '@/lib/points'
import type { PointSettingKey } from '@/types/points'

// GET /api/admin/points/settings - Get all point settings
export async function GET() {
  try {
    const auth = await checkAdminAuth()
    if (!auth) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const settings = await getPointSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching point settings:', error)
    return NextResponse.json(
      { error: '설정을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/points/settings - Update point settings
export async function PATCH(request: NextRequest) {
  try {
    const auth = await checkAdminAuth()
    if (!auth) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body as { settings: Record<string, number> }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    // Update each setting
    const validKeys: PointSettingKey[] = [
      'points_enabled',
      'streak_enabled',
      'diary_write_points',
      'first_diary_bonus',
      'streak_7_bonus',
      'streak_14_bonus',
      'streak_30_bonus',
      'streak_60_bonus',
      'streak_100_bonus',
    ]

    const updates: { key: string; success: boolean }[] = []

    for (const [key, value] of Object.entries(settings)) {
      if (validKeys.includes(key as PointSettingKey) && typeof value === 'number') {
        const success = await updatePointSetting(
          key as PointSettingKey,
          value,
          auth.userId
        )
        updates.push({ key, success })
      }
    }

    // Get updated settings
    const updatedSettings = await getPointSettings()

    return NextResponse.json({
      success: true,
      updates,
      settings: updatedSettings,
    })
  } catch (error) {
    console.error('Error updating point settings:', error)
    return NextResponse.json(
      { error: '설정을 업데이트하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
