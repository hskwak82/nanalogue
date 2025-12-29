'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfileName(name: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // Use upsert to create profile if it doesn't exist
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      name: name.trim() || null,
    }, { onConflict: 'id' })

  if (error) {
    console.error('Profile update error:', error)
    return { error: `저장에 실패했습니다: ${error.message}` }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/home')
  return { success: true }
}
