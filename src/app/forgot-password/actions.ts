'use server'

import { createClient } from '@/lib/supabase/server'

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  if (!email) {
    return { error: '이메일을 입력해주세요.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=recovery`,
  })

  if (error) {
    // Don't reveal if email exists or not for security
    if (error.message.includes('rate limit')) {
      return { error: '잠시 후 다시 시도해주세요.' }
    }
    // Return success even if email doesn't exist (security best practice)
    return { success: true }
  }

  return { success: true }
}
