import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/Navigation'
import { VoiceSettings } from './VoiceSettings'
import { CalendarSettings } from './CalendarSettings'
import { SubscriptionSection } from './SubscriptionSection'
import { isAdmin } from '@/lib/admin'
import type { UserSubscription } from '@/types/payment'

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

  // Check if Google Calendar is connected
  const { data: calendarToken } = await supabase
    .from('calendar_tokens')
    .select('id')
    .eq('user_id', user?.id)
    .eq('provider', 'google')
    .maybeSingle()

  const isCalendarConnected = !!calendarToken

  // Get subscription info
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user?.id)
    .single()

  const userSubscription = subscription as UserSubscription | null

  // Check if user is admin
  const userIsAdmin = user ? await isAdmin(user.id) : false

  return (
    <div className="min-h-screen bg-pastel-cream">
      <Navigation
        user={user ? { email: user.email, name: profile?.name } : null}
      />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-700">설정</h1>

        {/* Subscription Section */}
        <SubscriptionSection subscription={userSubscription} />

        {/* Profile Section */}
        <section className="mb-8 rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">프로필</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">
                이메일
              </label>
              <p className="mt-1 text-gray-700">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                이름
              </label>
              <p className="mt-1 text-gray-700">{profile?.name || '-'}</p>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-8 rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">선호 설정</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">
                대화 톤
              </label>
              <p className="mt-1 text-gray-700">
                {preferences?.tone === 'friendly'
                  ? '친근한'
                  : preferences?.tone === 'formal'
                    ? '정중한'
                    : '캐주얼'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">
                언어
              </label>
              <p className="mt-1 text-gray-700">
                {preferences?.language === 'ko' ? '한국어' : 'English'}
              </p>
            </div>
          </div>
        </section>

        {/* Voice Settings Section */}
        <section className="mb-8 rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">음성 설정</h2>
          {user && (
            <VoiceSettings
              userId={user.id}
              currentVoice={preferences?.tts_voice || null}
            />
          )}
        </section>

        {/* Calendar Integration */}
        <section className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
          <h2 className="mb-4 text-lg font-semibold text-gray-700">
            캘린더 연동
          </h2>
          <CalendarSettings isConnected={isCalendarConnected} />
        </section>

        {/* Admin Section - Only visible to admins */}
        {userIsAdmin && (
          <section className="mt-8 rounded-2xl bg-indigo-50 p-6 shadow-sm border border-indigo-200">
            <h2 className="mb-4 text-lg font-semibold text-indigo-900">관리자</h2>
            <p className="text-sm text-indigo-700 mb-4">
              서비스 관리 및 통계를 확인할 수 있습니다.
            </p>
            <Link
              href="/settings/admin"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              관리자 대시보드
            </Link>
          </section>
        )}
      </main>
    </div>
  )
}
