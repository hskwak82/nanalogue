'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { updatePassword } from './actions'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if we have a valid session from the email link
    const checkSession = async () => {
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        setIsValidSession(true)
      } else {
        // Try to check if there's an active session
        const response = await fetch('/api/auth/check-session')
        const data = await response.json()
        setIsValidSession(data.hasSession)
      }
    }
    checkSession()
  }, [])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    const result = await updatePassword(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pastel-cream">
        <div className="animate-pulse text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (isValidSession === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pastel-cream px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center">
            <Logo size="lg" />
          </div>

          <div className="mt-8 space-y-6 rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-lg border border-pastel-pink/30">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">링크가 만료되었습니다</h2>
              <p className="text-sm text-gray-600">
                비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.
                <br />
                다시 비밀번호 재설정을 요청해주세요.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block mt-4 rounded-full bg-pastel-purple px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pastel-purple-dark transition-all"
              >
                비밀번호 재설정 요청
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pastel-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Logo size="lg" />
          <p className="mt-3 text-center text-gray-500">
            새 비밀번호 설정
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
              <h2 className="text-lg font-semibold text-gray-800">비밀번호가 변경되었습니다</h2>
              <p className="text-sm text-gray-600">
                새 비밀번호로 로그인할 수 있습니다.
                <br />
                잠시 후 로그인 페이지로 이동합니다.
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 text-sm font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
              >
                지금 로그인하기
              </Link>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-pastel-peach-light p-3 text-sm text-gray-700">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-500"
                >
                  새 비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full rounded-xl border border-pastel-pink px-3 py-2 shadow-sm focus:border-pastel-purple focus:outline-none focus:ring-1 focus:ring-pastel-purple"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-gray-400">최소 6자 이상</p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-500"
                >
                  비밀번호 확인
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-1 block w-full rounded-xl border border-pastel-pink px-3 py-2 shadow-sm focus:border-pastel-purple focus:outline-none focus:ring-1 focus:ring-pastel-purple"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-pastel-purple px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pastel-purple-dark transition-all focus:outline-none focus:ring-2 focus:ring-pastel-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
