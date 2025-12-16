import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/Logo'

export default async function LandingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/home')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-pink-light to-pastel-cream">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Logo size="md" />
          <div className="space-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-500 hover:text-pastel-purple-dark transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-pastel-purple px-5 py-2 text-sm font-medium text-white hover:bg-pastel-purple-dark transition-all shadow-sm"
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-700 sm:text-5xl">
            매일의 기록,
            <br />
            <span className="text-pastel-purple">AI와 함께</span>
          </h1>
          <p className="mt-6 text-lg text-gray-500">
            AI와의 따뜻한 대화를 통해 하루를 기록하세요.
            <br />
            일기 쓰기가 어려웠던 당신을 위한, 새로운 방식의 일기장입니다.
          </p>
          <div className="mt-10">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-pastel-purple px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-pastel-purple-dark transition-all"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-24 max-w-5xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-pastel-purple-light">
                <svg
                  className="h-6 w-6 text-pastel-purple-dark"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-700">
                대화형 기록
              </h3>
              <p className="text-gray-500">
                AI의 질문에 답하기만 하면 자연스럽게 하루가 기록됩니다.
              </p>
            </div>

            <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-pastel-peach-light">
                <svg
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-700">
                AI 일기 생성
              </h3>
              <p className="text-gray-500">
                대화 내용을 바탕으로 AI가 따뜻한 일기를 작성해드립니다.
              </p>
            </div>

            <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-pastel-mint-light">
                <svg
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-700">
                감정 분석
              </h3>
              <p className="text-gray-500">
                오늘의 감정과 감사한 점을 자동으로 정리해드립니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-pastel-pink py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-400">
          &copy; 2024 나날로그. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
