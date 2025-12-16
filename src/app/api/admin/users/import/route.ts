import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'
import * as XLSX from 'xlsx'

interface ImportRow {
  '이메일': string
  '이름'?: string
  '비밀번호': string
  '플랜'?: string
  '구독기간(일)'?: string | number
}

interface FailedRow extends ImportRow {
  '실패사유': string
}

// POST /api/admin/users/import - Import users from Excel
export async function POST(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Read file
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'buffer' })

    // Get first sheet
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json<ImportRow>(ws)

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()
    const successList: string[] = []
    const failedRows: FailedRow[] = []

    for (const row of data) {
      const email = row['이메일']?.toString().trim()
      const name = row['이름']?.toString().trim()
      const password = row['비밀번호']?.toString()
      const plan = row['플랜']?.toString().toLowerCase() || 'free'
      const durationDays = parseInt(row['구독기간(일)']?.toString() || '30') || 30

      // Validate required fields
      if (!email) {
        failedRows.push({ ...row, '실패사유': '이메일 누락' })
        continue
      }

      if (!password) {
        failedRows.push({ ...row, '실패사유': '비밀번호 누락' })
        continue
      }

      if (password.length < 6) {
        failedRows.push({ ...row, '실패사유': '비밀번호 6자 이상 필요' })
        continue
      }

      try {
        // Create user
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: name || undefined,
            full_name: name || undefined,
          },
        })

        if (userError) {
          let errorMsg = userError.message
          if (errorMsg.includes('already been registered')) {
            errorMsg = '이미 등록된 이메일'
          }
          failedRows.push({ ...row, '실패사유': errorMsg })
          continue
        }

        // If pro plan, create subscription
        if (plan === 'pro' && userData.user) {
          const periodEnd = new Date()
          periodEnd.setDate(periodEnd.getDate() + durationDays)

          await supabase.from('subscriptions').upsert({
            user_id: userData.user.id,
            plan: 'pro',
            status: 'active',
            current_period_end: periodEnd.toISOString(),
          })
        }

        successList.push(email)
      } catch (err) {
        failedRows.push({
          ...row,
          '실패사유': err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    // If there are failed rows, return as Excel file
    if (failedRows.length > 0) {
      const failedData = failedRows.map(row => ({
        '이메일': row['이메일'] || '',
        '이름': row['이름'] || '',
        '비밀번호': row['비밀번호'] || '',
        '플랜': row['플랜'] || '',
        '구독기간(일)': row['구독기간(일)'] || '',
        '실패사유': row['실패사유'],
      }))

      const failedWb = XLSX.utils.book_new()
      const failedWs = XLSX.utils.json_to_sheet(failedData)
      failedWs['!cols'] = [
        { wch: 30 }, // 이메일
        { wch: 15 }, // 이름
        { wch: 20 }, // 비밀번호
        { wch: 10 }, // 플랜
        { wch: 15 }, // 구독기간
        { wch: 30 }, // 실패사유
      ]
      XLSX.utils.book_append_sheet(failedWb, failedWs, '등록실패')

      const buf = XLSX.write(failedWb, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('나날로그_등록실패_목록.xlsx')}`,
          'X-Import-Success': successList.length.toString(),
          'X-Import-Failed': failedRows.length.toString(),
        },
      })
    }

    // All succeeded
    return NextResponse.json({
      message: `${successList.length}명 등록 완료`,
      successCount: successList.length,
      failedCount: 0,
    })
  } catch (error) {
    console.error('Error importing users:', error)
    return NextResponse.json(
      { error: 'Failed to import users' },
      { status: 500 }
    )
  }
}
