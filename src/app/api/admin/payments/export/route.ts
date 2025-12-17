import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import * as XLSX from 'xlsx'

const statusLabels: Record<string, string> = {
  DONE: '완료',
  PENDING: '대기',
  CANCELED: '취소',
  FAILED: '실패',
}

// GET /api/admin/payments/export - Export payments to Excel
export async function GET(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const period = searchParams.get('period') || ''

    const supabase = getAdminServiceClient()

    // Build base query
    let query = supabase
      .from('payment_history')
      .select('*')

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply period filter
    if (period) {
      const now = new Date()
      let startDate: Date

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte('created_at', startDate.toISOString())
    }

    // Get all payments (no pagination for export)
    const { data: payments, error: paymentsError } = await query
      .order('created_at', { ascending: false })

    if (paymentsError) {
      throw paymentsError
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({ error: 'No payments found' }, { status: 404 })
    }

    // Get user info for these payments
    const userIds = [...new Set(payments.map((p) => p.user_id))]
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('id', userIds)

    const userMap = new Map(users?.map((u) => [u.id, { email: u.email, name: u.name }]))

    // Prepare data for Excel
    const excelData = payments.map((p) => {
      const user = userMap.get(p.user_id)
      return {
        '결제일시': p.paid_at
          ? new Date(p.paid_at).toLocaleString('ko-KR')
          : new Date(p.created_at).toLocaleString('ko-KR'),
        '사용자명': user?.name || '',
        '이메일': user?.email || 'Unknown',
        '플랜': p.plan_id === 'pro' ? '프로' : p.plan_id,
        '금액': p.amount,
        '상태': statusLabels[p.status] || p.status,
        '주문ID': p.order_id,
        '결제키': p.payment_key || '',
        '실패사유': p.failure_reason || '',
        '생성일시': new Date(p.created_at).toLocaleString('ko-KR'),
      }
    })

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // 결제일시
      { wch: 15 }, // 사용자명
      { wch: 30 }, // 이메일
      { wch: 10 }, // 플랜
      { wch: 12 }, // 금액
      { wch: 10 }, // 상태
      { wch: 30 }, // 주문ID
      { wch: 30 }, // 결제키
      { wch: 30 }, // 실패사유
      { wch: 20 }, // 생성일시
    ]

    XLSX.utils.book_append_sheet(wb, ws, '결제내역')

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return as download
    const filename = `나날로그_결제내역_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('Error exporting payments:', error)
    return NextResponse.json(
      { error: 'Failed to export payments' },
      { status: 500 }
    )
  }
}
