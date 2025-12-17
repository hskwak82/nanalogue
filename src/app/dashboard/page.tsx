import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'
import { CalendarWidget } from '@/components/CalendarWidget'
import { DiaryShelfSection } from '@/components/dashboard/DiaryShelfSection'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import type { DiaryWithTemplates } from '@/types/diary'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Phase 1: Parallel fetch all Supabase queries
  const [profileResult, sessionsResult, diaryEntriesResult, calendarTokenResult, diariesResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('daily_sessions').select('*').eq('user_id', user.id).order('session_date', { ascending: false }).limit(7),
    supabase.from('diary_entries').select('entry_date').eq('user_id', user.id),
    supabase.from('calendar_tokens').select('id').eq('user_id', user.id).eq('provider', 'google').maybeSingle(),
    supabase.from('diaries').select('*, cover_templates(*)').eq('user_id', user.id).order('volume_number', { ascending: true }),
  ])

  const profile = profileResult.data
  const sessions = sessionsResult.data
  const diaryEntries = diaryEntriesResult.data
  const isCalendarConnected = !!calendarTokenResult.data
  const diariesData = diariesResult.data

  // Google Calendar events are now loaded client-side by CalendarWidget for faster initial render

  // Transform to DiaryWithTemplates format
  const diaries: DiaryWithTemplates[] = (diariesData || []).map(d => ({
    ...d,
    cover_template: d.cover_templates,
    paper_template: null,
  }))

  // Find active diary
  const activeDiary = diaries.find(d => d.status === 'active') || null

  // Get today's date in Korea timezone
  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const todaySession = sessions?.find(
    (s) => s.session_date === new Date().toISOString().split('T')[0]
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/30 to-pastel-cream">
      <Navigation
        user={user ? { email: user.email, name: profile?.name } : null}
      />

      <main className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12 lg:px-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-700">
            안녕하세요{profile?.name ? `, ${profile.name}님` : ''}!
          </h1>
          <p className="mt-1 text-gray-500">{today}</p>
        </div>

        {/* Responsive Layout - Desktop: grid, Mobile: swipeable */}
        <DashboardLayout
          calendarContent={
            <CalendarWidget
              entries={diaryEntries?.map((e) => ({ entry_date: e.entry_date })) || []}
              isConnected={isCalendarConnected}
            />
          }
          mainContent={
            <>
              {/* Diary Shelf - Shows cover + other diaries as spines */}
              <DiaryShelfSection
                diaries={diaries}
                activeDiaryId={activeDiary?.id || null}
                userName={profile?.name || undefined}
              />
              {/* Today's Session Card */}
              <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
                <h2 className="mb-4 text-lg font-semibold text-gray-700">
                  오늘의 기록
                </h2>

                {todaySession ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-3 py-1 text-sm ${
                          todaySession.status === 'completed'
                            ? 'bg-pastel-mint-light text-pastel-purple-dark'
                            : 'bg-pastel-peach-light text-pastel-purple-dark'
                        }`}
                      >
                        {todaySession.status === 'completed' ? '완료' : '진행 중'}
                      </span>
                      <Link
                        href="/session"
                        className="text-sm font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
                      >
                        {todaySession.status === 'completed'
                          ? '일기 보기'
                          : '이어하기'}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="mb-4 text-gray-500">아직 오늘의 기록이 없습니다.</p>
                    <Link
                      href="/session"
                      className="inline-flex items-center justify-center rounded-full bg-pastel-purple px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pastel-purple-dark transition-all"
                    >
                      오늘 기록 시작하기
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Sessions */}
              <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
                <h2 className="mb-4 text-lg font-semibold text-gray-700">
                  최근 7일 기록
                </h2>

                {sessions && sessions.length > 0 ? (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/diary/${session.session_date}`}
                        className="flex items-center justify-between rounded-xl border border-pastel-pink/30 p-4 hover:bg-pastel-pink-light/50 transition-all"
                      >
                        <div>
                          <p className="font-medium text-gray-700">
                            {new Date(session.session_date).toLocaleDateString(
                              'ko-KR',
                              {
                                month: 'long',
                                day: 'numeric',
                                weekday: 'short',
                              }
                            )}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            session.status === 'completed'
                              ? 'bg-pastel-mint-light text-pastel-purple-dark'
                              : session.status === 'active'
                                ? 'bg-pastel-peach-light text-pastel-purple-dark'
                                : 'bg-pastel-warm text-gray-600'
                          }`}
                        >
                          {session.status === 'completed'
                            ? '완료'
                            : session.status === 'active'
                              ? '진행 중'
                              : '중단'}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500">아직 기록이 없습니다.</p>
                )}
              </div>
            </>
          }
        />
      </main>
    </div>
  )
}
