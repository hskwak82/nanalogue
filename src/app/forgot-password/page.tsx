'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { resetPassword } from './actions'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await resetPassword(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pastel-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Logo size="lg" />
          <p className="mt-3 text-center text-gray-500">
            비밀번호 재설정
          </p>
        </div>

        <div className="mt-8 space-y-6 rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-lg border border-pastel-pink/30">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">이메일을 확인해주세요</h2>
              <p className="text-sm text-gray-600">
                비밀번호 재설정 링크를 이메일로 발송했습니다.
                <br />
                이메일의 링크를 클릭하여 새 비밀번호를 설정해주세요.
              </p>
              <p className="text-xs text-gray-400">
                이메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 text-sm font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
              >
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  가입할 때 사용한 이메일 주소를 입력하시면
                  <br />
                  비밀번호 재설정 링크를 보내드립니다.
                </p>
              </div>

              <form action={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-pastel-peach-light p-3 text-sm text-gray-700">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-500"
                  >
                    이메일
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 block w-full rounded-xl border border-pastel-pink px-3 py-2 shadow-sm focus:border-pastel-purple focus:outline-none focus:ring-1 focus:ring-pastel-purple"
                    placeholder="name@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-pastel-purple px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pastel-purple-dark transition-all focus:outline-none focus:ring-2 focus:ring-pastel-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? '발송 중...' : '재설정 링크 받기'}
                </button>
              </form>

              <div className="text-center space-y-2">
                <Link
                  href="/login"
                  className="block text-sm font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
                >
                  로그인으로 돌아가기
                </Link>
                <p className="text-xs text-gray-400">
                  Google로 가입하셨나요? 로그인 페이지에서 Google 로그인을 이용해주세요.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
