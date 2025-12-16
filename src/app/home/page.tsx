import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookIntro } from '@/components/home/BookIntro'
import type { DiaryWithTemplates } from '@/types/diary'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  // Get active diary with template
  const { data: diaryData } = await supabase
    .from('diaries')
    .select('*, cover_templates(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  // Transform to DiaryWithTemplates format
  const activeDiary: DiaryWithTemplates | null = diaryData
    ? {
        ...diaryData,
        cover_template: diaryData.cover_templates,
        paper_template: null,
      }
    : null

  return (
    <BookIntro
      diary={activeDiary}
      userName={profile?.name || undefined}
    />
  )
}
