import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin'
import * as XLSX from 'xlsx'

// GET /api/admin/users/template - Download Excel template for bulk import
export async function GET() {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Create template with sample data
    const templateData = [
      {
        '이메일': 'example@email.com',
        '이름': '홍길동',
        '비밀번호': 'Password123!',
        '플랜': 'free',
        '구독기간(일)': '',
      },
      {
        '이메일': 'test@email.com',
        '이름': '김철수',
        '비밀번호': 'Password456!',
        '플랜': 'pro',
        '구독기간(일)': '30',
      },
    ]

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(templateData)

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // 이메일
      { wch: 15 }, // 이름
      { wch: 20 }, // 비밀번호
      { wch: 10 }, // 플랜
      { wch: 15 }, // 구독기간(일)
    ]

    XLSX.utils.book_append_sheet(wb, ws, '사용자등록')

    // Add instructions sheet
    const instructionData = [
      { '항목': '이메일', '필수': '필수', '설명': '사용자 이메일 주소' },
      { '항목': '이름', '필수': '선택', '설명': '사용자 이름' },
      { '항목': '비밀번호', '필수': '필수', '설명': '최소 8자, 대소문자+숫자 포함 권장' },
      { '항목': '플랜', '필수': '선택', '설명': 'free 또는 pro (기본값: free)' },
      { '항목': '구독기간(일)', '필수': '선택', '설명': 'pro 플랜일 때 구독 기간 (기본값: 30)' },
    ]
    const wsInstructions = XLSX.utils.json_to_sheet(instructionData)
    wsInstructions['!cols'] = [
      { wch: 15 },
      { wch: 10 },
      { wch: 50 },
    ]
    XLSX.utils.book_append_sheet(wb, wsInstructions, '작성안내')

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return as download
    const filename = '나날로그_사용자등록_양식.xlsx'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    )
  }
}
