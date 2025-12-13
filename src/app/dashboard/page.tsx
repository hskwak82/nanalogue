import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'

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
    <div className="min-h-screen bg-gray-50">
      <Navigation
        user={user ? { email: user.email, name: profile?.name } : null}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            안녕하세요{profile?.name ? `, ${profile.name}님` : ''}!
          </h1>
          <p className="mt-1 text-gray-600">{today}</p>
        </div>

        {/* Today's Session Card */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            오늘의 기록
          </h2>

          {todaySession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-sm ${
                    todaySession.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {todaySession.status === 'completed' ? '완료' : '진행 중'}
                </span>
                <Link
                  href="/session"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  {todaySession.status === 'completed'
                    ? '일기 보기'
                    : '이어하기'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-4 text-gray-500">아직 오늘의 기록이 없습니다.</p>
              <Link
                href="/session"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                오늘 기록 시작하기
              </Link>
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            최근 7일 기록
          </h2>

          {sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/diary/${session.session_date}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">
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
                    className={`rounded-full px-2 py-1 text-xs ${
                      session.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : session.status === 'active'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
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
      </main>
    </div>
  )
}
