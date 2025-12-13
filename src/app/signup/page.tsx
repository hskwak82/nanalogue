'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup, signInWithGoogle } from '../login/actions'
import { Logo } from '@/components/Logo'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)

    const result = await signInWithGoogle()
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pastel-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Logo size="lg" />
          <p className="mt-3 text-center text-gray-500">
            새 계정 만들기
          </p>
        </div>

        <div className="mt-8 space-y-6 rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-lg border border-pastel-pink/30">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-pastel-pink bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-pastel-pink-light transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 계속하기
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-pastel-pink" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/80 px-2 text-gray-400">또는</span>
            </div>
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

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-500"
              >
                비밀번호
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
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{' '}
            <Link
              href="/login"
              className="font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
