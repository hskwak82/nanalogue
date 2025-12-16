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
    const results: { success: string[]; failed: { email: string; error: string }[] } = {
      success: [],
      failed: [],
    }

    for (const row of data) {
      const email = row['이메일']?.toString().trim()
      const name = row['이름']?.toString().trim()
      const password = row['비밀번호']?.toString()
      const plan = row['플랜']?.toString().toLowerCase() || 'free'
      const durationDays = parseInt(row['구독기간(일)']?.toString() || '30') || 30

      // Validate required fields
      if (!email) {
        results.failed.push({ email: '(빈 이메일)', error: '이메일 누락' })
        continue
      }

      if (!password) {
        results.failed.push({ email, error: '비밀번호 누락' })
        continue
      }

      if (password.length < 6) {
        results.failed.push({ email, error: '비밀번호 6자 이상' })
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
          results.failed.push({ email, error: userError.message })
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

        results.success.push(email)
      } catch (err) {
        results.failed.push({
          email,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: `${results.success.length}명 등록 완료, ${results.failed.length}명 실패`,
      success: results.success,
      failed: results.failed,
    })
  } catch (error) {
    console.error('Error importing users:', error)
    return NextResponse.json(
      { error: 'Failed to import users' },
      { status: 500 }
    )
  }
}
