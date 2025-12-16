import { NextResponse } from 'next/server'
import { checkAdminAuth, getAdminServiceClient } from '@/lib/admin'

// DELETE /api/admin/users/bulk - Bulk delete users
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds is required' }, { status: 400 })
    }

    const supabase = getAdminServiceClient()

    let successCount = 0
    let failCount = 0

    for (const userId of userIds) {
      // Delete user from auth.users (this will cascade to profiles and other tables)
      const { error } = await supabase.auth.admin.deleteUser(userId)

      if (error) {
        console.error(`Failed to delete user ${userId}:`, error)
        failCount++
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      message: `${successCount}명의 사용자가 삭제되었습니다.${failCount > 0 ? ` (${failCount}명 실패)` : ''}`,
      successCount,
      failCount,
    })
  } catch (error) {
    console.error('Error bulk deleting users:', error)
    return NextResponse.json(
      { error: 'Failed to bulk delete users' },
      { status: 500 }
    )
  }
}
