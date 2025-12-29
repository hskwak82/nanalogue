import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'
import { DiaryActionsWrapper } from './DiaryActionsWrapper'
import { DiaryContentWithBackground } from '@/components/diary/DiaryContentWithBackground'
import type { PaperTemplate, PlacedDecoration } from '@/types/customization'

interface DiaryDetailPageProps {
  params: Promise<{ date: string }>
}

export default async function DiaryDetailPage({ params }: DiaryDetailPageProps) {
  const { date } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch entry with session image URL
  const { data: entry } = await supabase
    .from('diary_entries')
    .select(`
      *,
      session:daily_sessions!session_id (
        session_image_url
      )
    `)
    .eq('user_id', user.id)
    .eq('entry_date', date)
    .single()

  if (!entry) {
    // Redirect to session page to write diary for this date
    redirect(`/session?entry=true&date=${date}`)
  }

  // Extract session image data and style
  const sessionImageUrl = (entry.session as { session_image_url: string | null } | null)?.session_image_url || null
  const sessionImageOpacity = (entry.session_image_opacity as number) ?? 0.15
  const sessionFontColor = (entry.session_font_color as string | null) ?? null

  // Get diary customization for paper template and decorations
  // First try to get from the diary associated with this entry
  let paperTemplate: PaperTemplate | null = null
  let paperDecorations: PlacedDecoration[] = []
  let paperOpacity = 1.0
  let paperFontFamily = 'default'
  let paperFontColor = '#333333'

  if (entry.diary_id) {
    const { data: diary } = await supabase
      .from('diaries')
      .select('paper_template_id, paper_decorations, paper_opacity, paper_font_family, paper_font_color, paper_templates(*)')
      .eq('id', entry.diary_id)
      .single()

    if (diary) {
      // paper_templates is returned as a single object (or null) from foreign key join
      paperTemplate = (diary.paper_templates as unknown as PaperTemplate) || null
      paperDecorations = (diary.paper_decorations || []) as PlacedDecoration[]
      paperOpacity = diary.paper_opacity ?? 1.0
      paperFontFamily = diary.paper_font_family ?? 'default'
      paperFontColor = diary.paper_font_color ?? '#333333'
    }
  }

  // Fallback to diary_customization if no diary found
  if (!paperTemplate) {
    const { data: customization } = await supabase
      .from('diary_customization')
      .select('*, paper_templates(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (customization) {
      paperTemplate = (customization.paper_templates as unknown as PaperTemplate) || null
      paperDecorations = (customization.paper_decorations || []) as PlacedDecoration[]
      paperOpacity = customization.paper_opacity ?? 1.0
      paperFontFamily = customization.paper_font_family ?? 'default'
      paperFontColor = customization.paper_font_color ?? '#333333'
    }
  }

  const formattedDate = new Date(entry.entry_date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="min-h-screen bg-pastel-cream">
      <Navigation
        user={user ? { email: user.email, name: profile?.name } : null}
      />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link
          href="/diary"
          className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-pastel-purple-dark transition-colors"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          일기 목록
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-700">{formattedDate}</h1>
          {entry.summary && (
            <p className="mt-2 text-lg text-gray-500">{entry.summary}</p>
          )}
        </div>

        {/* Actions */}
        <div className="mb-8">
          <DiaryActionsWrapper date={date} sessionId={entry.session_id} />
        </div>

        {/* Emotions */}
        {entry.emotions &&
          Array.isArray(entry.emotions) &&
          entry.emotions.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                오늘의 감정
              </h2>
              <div className="flex flex-wrap gap-2">
                {(entry.emotions as string[]).map((emotion, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-pastel-purple-light px-3 py-1 text-sm text-pastel-purple-dark"
                  >
                    {emotion}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Diary Content with Background Image */}
        <DiaryContentWithBackground
          entryId={entry.id}
          content={entry.content as string}
          paperTemplate={paperTemplate}
          paperDecorations={paperDecorations}
          paperOpacity={paperOpacity}
          paperFontFamily={paperFontFamily}
          paperFontColor={paperFontColor}
          sessionImageUrl={sessionImageUrl}
          initialSessionImageOpacity={sessionImageOpacity}
          initialSessionFontColor={sessionFontColor}
        />

        {/* Gratitude */}
        {entry.gratitude &&
          Array.isArray(entry.gratitude) &&
          entry.gratitude.length > 0 && (
            <div className="mb-6 rounded-2xl bg-pastel-peach-light p-6 border border-pastel-peach/30">
              <h2 className="mb-3 text-sm font-medium text-gray-600">
                감사한 점
              </h2>
              <ul className="space-y-2">
                {(entry.gratitude as string[]).map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start text-gray-700"
                  >
                    <span className="mr-2">✨</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Tomorrow Plan */}
        {entry.tomorrow_plan && (
          <div className="rounded-2xl bg-pastel-mint-light p-6 border border-pastel-mint/30">
            <h2 className="mb-3 text-sm font-medium text-gray-600">
              내일의 다짐
            </h2>
            <p className="text-gray-700">{entry.tomorrow_plan}</p>
          </div>
        )}
      </main>
    </div>
  )
}
