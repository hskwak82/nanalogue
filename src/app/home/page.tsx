import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'
import { HeroSection } from '@/components/home/HeroSection'
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

  // Parallel fetch: profile, active diary
  const [profileResult, diaryResult] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).single(),
    supabase.from('diaries').select('*, cover_templates(*)').eq('user_id', user.id).eq('status', 'active').single(),
  ])

  const profile = profileResult.data
  const diaryData = diaryResult.data

  // Transform to DiaryWithTemplates format
  const activeDiary: DiaryWithTemplates | null = diaryData
    ? {
        ...diaryData,
        cover_template: diaryData.cover_templates,
        paper_template: null,
      }
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/30 to-pastel-cream">
      <Navigation user={{ email: user.email, name: profile?.name }} />
      <HeroSection />
      <BookIntro
        diary={activeDiary}
        userName={profile?.name || undefined}
      />
    </div>
  )
}
