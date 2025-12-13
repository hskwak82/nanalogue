import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'
import { DiaryActions } from './DiaryActions'

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

  const { data: entry } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('entry_date', date)
    .single()

  if (!entry) {
    return notFound()
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
          <DiaryActions date={date} sessionId={entry.session_id} />
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

        {/* Diary Content */}
        <div className="mb-8 rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
          <div className="prose prose-gray max-w-none">
            {(entry.content as string).split('\n').map((paragraph: string, idx: number) => (
              <p key={idx} className="mb-4 last:mb-0 text-gray-700 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

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
