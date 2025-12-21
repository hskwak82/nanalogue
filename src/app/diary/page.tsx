import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'
import { DiaryListClient } from '@/components/diary/DiaryListClient'
import type { DiaryWithTemplates } from '@/types/diary'

interface DiaryListPageProps {
  searchParams: Promise<{ diary?: string }>
}

export default async function DiaryListPage({ searchParams }: DiaryListPageProps) {
  const supabase = await createClient()
  const { diary: initialDiaryId } = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch all data in parallel
  const [profileResult, diariesResult, entriesResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user?.id).single(),
    supabase.from('diaries').select('*, cover_templates(*)').eq('user_id', user?.id).order('volume_number', { ascending: true }),
    supabase.from('diary_entries').select('id, entry_date, summary, emotions, diary_id').eq('user_id', user?.id).order('entry_date', { ascending: false }),
  ])

  const profile = profileResult.data
  const diariesData = diariesResult.data
  const entries = entriesResult.data || []

  // Transform to DiaryWithTemplates format
  const diaries: DiaryWithTemplates[] = (diariesData || []).map(d => ({
    ...d,
    cover_template: d.cover_templates,
    paper_template: null,
  }))

  return (
    <div className="min-h-screen bg-pastel-cream">
      <Navigation
        user={user ? { email: user.email, name: profile?.name } : null}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-700">나의 일기</h1>
        </div>

        <DiaryListClient
          diaries={diaries}
          entries={entries}
          initialDiaryId={initialDiaryId}
        />
      </main>
    </div>
  )
}
