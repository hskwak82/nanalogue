import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'
import { CalendarWidget } from '@/components/CalendarWidget'
import { getMonthEvents } from '@/lib/google-calendar'
import { DiaryCoverPreview } from '@/components/DiaryCoverPreview'
import type { CoverTemplate, PlacedDecoration } from '@/types/customization'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get recent sessions
  const { data: sessions } = await supabase
    .from('daily_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('session_date', { ascending: false })
    .limit(7)

  // Get all diary entries for calendar display
  const { data: diaryEntries } = await supabase
    .from('diary_entries')
    .select('entry_date')
    .eq('user_id', user.id)

  // Check if Google Calendar is connected
  const { data: calendarToken } = await supabase
    .from('calendar_tokens')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle()

  const isCalendarConnected = !!calendarToken

  // Get Google Calendar events for current month if connected
  let googleEvents: { date: string; title: string; time?: string; endTime?: string; isAllDay: boolean }[] = []
  if (isCalendarConnected) {
    const now = new Date()
    googleEvents = await getMonthEvents(user.id, now.getFullYear(), now.getMonth())
  }

  // Get diary customization
  const { data: customization } = await supabase
    .from('diary_customization')
    .select('*, cover_templates(*)')
    .eq('user_id', user.id)
    .maybeSingle()

  const coverTemplate = customization?.cover_templates as CoverTemplate | null
  const coverDecorations = (customization?.cover_decorations || []) as PlacedDecoration[]

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
    <div className="min-h-screen bg-pastel-cream">
      <Navigation
        user={user ? { email: user.email, name: profile?.name } : null}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-700">
            안녕하세요{profile?.name ? `, ${profile.name}님` : ''}!
          </h1>
          <p className="mt-1 text-gray-500">{today}</p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Calendar (1/3) */}
          <div className="lg:col-span-1">
            <CalendarWidget
              entries={diaryEntries?.map((e) => ({ entry_date: e.entry_date })) || []}
              isConnected={isCalendarConnected}
              googleEvents={googleEvents}
            />
          </div>

          {/* Right: Main Content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Diary Cover Preview - Click to enter diary */}
            <DiaryCoverPreview
              template={coverTemplate}
              decorations={coverDecorations}
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
          </div>
        </div>
      </main>
    </div>
  )
}
