'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Convert Supabase error messages to Korean
function getKoreanErrorMessage(errorMessage: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
    'User not found': '등록되지 않은 이메일입니다.',
    'Invalid email or password': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Email already registered': '이미 가입된 이메일입니다.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    'User already registered': '이미 가입된 이메일입니다.',
    'Database error saving new user': '회원가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
  }

  return errorMap[errorMessage] || errorMessage
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: getKoreanErrorMessage(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect('/home')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: getKoreanErrorMessage(error.message) }
  }

  // If signup succeeded but trigger failed, create profile manually
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: data.user.email,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile creation error:', profileError)
    }

    // Create default preferences
    await supabase
      .from('user_preferences')
      .upsert({ user_id: data.user.id }, { onConflict: 'user_id' })

    // Create default subscription
    await supabase
      .from('subscriptions')
      .upsert({ user_id: data.user.id }, { onConflict: 'user_id' })

    // Create default points
    await supabase
      .from('user_points')
      .upsert({ user_id: data.user.id }, { onConflict: 'user_id' })
  }

  // Return success with email for confirmation message
  return { success: true, email }
}

export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
