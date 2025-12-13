import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user?.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        user={user ? { email: user.email, name: profile?.name } : null}
      />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">설정</h1>

        {/* Profile Section */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">프로필</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <p className="mt-1 text-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                이름
              </label>
              <p className="mt-1 text-gray-900">{profile?.name || '-'}</p>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">선호 설정</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                대화 톤
              </label>
              <p className="mt-1 text-gray-900">
                {preferences?.tone === 'friendly'
                  ? '친근한'
                  : preferences?.tone === 'formal'
                    ? '정중한'
                    : '캐주얼'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                언어
              </label>
              <p className="mt-1 text-gray-900">
                {preferences?.language === 'ko' ? '한국어' : 'English'}
              </p>
            </div>
          </div>
        </section>

        {/* Calendar Integration (Coming Soon) */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            캘린더 연동
          </h2>
          <p className="text-gray-600">
            Google Calendar와 연동하여 일정 기반 회고를 할 수 있습니다.
          </p>
          <button
            disabled
            className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
          >
            준비 중
          </button>
        </section>
      </main>
    </div>
  )
}
