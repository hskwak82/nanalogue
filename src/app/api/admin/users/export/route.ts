import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import * as XLSX from 'xlsx'

// GET /api/admin/users/export - Export users to Excel
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const userIdsParam = searchParams.get('userIds')
    const selectedUserIds = userIdsParam ? userIdsParam.split(',') : null

    const supabase = getAdminServiceClient()

    // Get profiles (filtered if userIds provided)
    let query = supabase
      .from('profiles')
      .select('id, email, name, created_at')

    if (selectedUserIds && selectedUserIds.length > 0) {
      query = query.in('id', selectedUserIds)
    }

    const { data: profiles, error: profilesError } = await query
      .order('created_at', { ascending: false })

    if (profilesError) throw profilesError

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 })
    }

    // Get all subscriptions
    const userIds = profiles.map(p => p.id)
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('user_id, plan, status, toss_billing_key, current_period_end')
      .in('user_id', userIds)

    const subMap = new Map(
      subscriptions?.map(s => [s.user_id, s])
    )

    // Get diary counts
    const { data: diaryCounts } = await supabase
      .from('diaries')
      .select('user_id')
      .in('user_id', userIds)

    const diaryCountMap = new Map<string, number>()
    diaryCounts?.forEach(d => {
      diaryCountMap.set(d.user_id, (diaryCountMap.get(d.user_id) || 0) + 1)
    })

    // Prepare data for Excel
    const excelData = profiles.map(p => {
      const sub = subMap.get(p.id)
      const plan = sub?.plan || 'free'
      let subscriptionType = '-'
      if (plan === 'pro' && sub) {
        subscriptionType = sub.toss_billing_key ? '정기구독' : '수동부여'
      }

      return {
        '이름': p.name || '',
        '이메일': p.email,
        '플랜': plan === 'pro' ? '프로' : '무료',
        '구독유형': subscriptionType,
        '만료일': sub?.current_period_end
          ? new Date(sub.current_period_end).toLocaleDateString('ko-KR')
          : '-',
        '다이어리수': diaryCountMap.get(p.id) || 0,
        '가입일': new Date(p.created_at).toLocaleDateString('ko-KR'),
        '사용자ID': p.id,
      }
    })

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // 이름
      { wch: 30 }, // 이메일
      { wch: 10 }, // 플랜
      { wch: 12 }, // 구독유형
      { wch: 15 }, // 만료일
      { wch: 12 }, // 다이어리수
      { wch: 15 }, // 가입일
      { wch: 40 }, // 사용자ID
    ]

    XLSX.utils.book_append_sheet(wb, ws, '사용자목록')

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return as download
    const filename = `나날로그_사용자목록_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('Error exporting users:', error)
    return NextResponse.json(
      { error: 'Failed to export users' },
      { status: 500 }
    )
  }
}
