import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'
import { CalendarWidget } from '@/components/CalendarWidget'
import { DiaryShelfSection } from '@/components/dashboard/DiaryShelfSection'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AnnouncementCard } from '@/components/home/AnnouncementCard'
import { AnnouncementPopup } from '@/components/home/AnnouncementPopup'
import { getDailyQuote } from '@/lib/daily-quotes'
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

  const todayDateStr = new Date().toISOString().split('T')[0]
  const todaySession = sessions?.find(
    (s) => s.session_date === todayDateStr
  )

  // Count today's diary entries
  const todayDiaryCount = diaryEntries?.filter(
    (e) => e.entry_date === todayDateStr
  ).length || 0

  // Get daily quote
  const dailyQuote = getDailyQuote()

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/30 to-pastel-cream">
      <Navigation
        user={user ? { email: user.email, name: profile?.name } : null}
      />

      <main className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-12 lg:px-8">
        {/* Announcement Card */}
        <AnnouncementCard />
        {/* Daily Quote & Date */}
        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-medium text-gray-700 leading-relaxed">
            &ldquo;{dailyQuote.text}&rdquo;
            {dailyQuote.author && (
              <span className="text-base sm:text-lg text-gray-400 font-normal ml-2">- {dailyQuote.author}</span>
            )}
          </h1>
          <p className="mt-2 text-gray-500">{today}</p>
        </div>

        {/* Responsive Layout - Desktop: grid, Mobile: collapsible calendar */}
        <DashboardLayout
          calendarContent={
            <CalendarWidget
              entries={diaryEntries?.map((e) => ({ entry_date: e.entry_date })) || []}
              isConnected={isCalendarConnected}
            />
          }
          todayEventCount={todayDiaryCount}
          mainContent={
            <>
              {/* Diary Shelf - Shows cover + other diaries as spines */}
              <DiaryShelfSection
                diaries={diaries}
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
                        href={todaySession.status === 'completed' ? `/diary/${todayDateStr}` : '/session?entry=true'}
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
                      href="/session?entry=true"
                      className="inline-flex items-center justify-center rounded-full bg-pastel-purple px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pastel-purple-dark transition-all"
                    >
                      오늘 기록 시작하기
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Diary Entries - only show dates with actual diary entries */}
              <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
                <h2 className="mb-4 text-lg font-semibold text-gray-700">
                  최근 7일 기록
                </h2>

                {(() => {
                  // Get recent diary entries (last 7 days with actual entries)
                  const recentEntryDates = diaryEntries
                    ?.map(e => e.entry_date)
                    .sort((a, b) => b.localeCompare(a))
                    .slice(0, 7) || []

                  if (recentEntryDates.length > 0) {
                    return (
                      <div className="space-y-3">
                        {recentEntryDates.map((entryDate) => (
                          <Link
                            key={entryDate}
                            href={`/diary/${entryDate}`}
                            className="flex items-center justify-between rounded-xl border border-pastel-pink/30 p-4 hover:bg-pastel-pink-light/50 transition-all"
                          >
                            <div>
                              <p className="font-medium text-gray-700">
                                {new Date(entryDate).toLocaleDateString(
                                  'ko-KR',
                                  {
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'short',
                                  }
                                )}
                              </p>
                            </div>
                            <span className="rounded-full px-3 py-1 text-xs font-medium bg-pastel-mint-light text-pastel-purple-dark">
                              완료
                            </span>
                          </Link>
                        ))}
                      </div>
                    )
                  }
                  return <p className="text-center text-gray-500">아직 기록이 없습니다.</p>
                })()}
              </div>
            </>
          }
        />
      </main>
      <AnnouncementPopup />
    </div>
  )
}
