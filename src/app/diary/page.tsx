import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'

export default async function DiaryListPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  // Get all diary entries
  const { data: entries } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', user?.id)
    .order('entry_date', { ascending: false })

  // Group by month
  const entriesByMonth: Record<string, typeof entries> = {}
  entries?.forEach((entry) => {
    const monthKey = entry.entry_date.substring(0, 7) // YYYY-MM
    if (!entriesByMonth[monthKey]) {
      entriesByMonth[monthKey] = []
    }
    entriesByMonth[monthKey]!.push(entry)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        user={user ? { email: user.email, name: profile?.name } : null}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">나의 일기</h1>

        {entries && entries.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(entriesByMonth).map(([monthKey, monthEntries]) => (
              <div key={monthKey}>
                <h2 className="mb-4 text-lg font-semibold text-gray-700">
                  {new Date(monthKey + '-01').toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </h2>
                <div className="space-y-3">
                  {monthEntries?.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/diary/${entry.entry_date}`}
                      className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {new Date(entry.entry_date).toLocaleDateString(
                              'ko-KR',
                              {
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long',
                              }
                            )}
                          </p>
                          {entry.summary && (
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {entry.summary}
                            </p>
                          )}
                          {entry.emotions &&
                            Array.isArray(entry.emotions) &&
                            entry.emotions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(entry.emotions as string[]).slice(0, 3).map(
                                  (emotion, idx) => (
                                    <span
                                      key={idx}
                                      className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700"
                                    >
                                      {emotion}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">아직 작성된 일기가 없습니다.</p>
            <Link
              href="/session"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              첫 일기 작성하기
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
