'use server'

import { createClient } from '@/lib/supabase/server'

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string

  if (!password) {
    return { error: '비밀번호를 입력해주세요.' }
  }

  if (password.length < 6) {
    return { error: '비밀번호는 최소 6자 이상이어야 합니다.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    if (error.message.includes('should be different')) {
      return { error: '이전 비밀번호와 다른 비밀번호를 사용해주세요.' }
    }
    return { error: '비밀번호 변경에 실패했습니다. 다시 시도해주세요.' }
  }

  return { success: true }
}
