'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'
import { Logo } from './Logo'

interface NavigationProps {
  user: {
    email?: string
    name?: string
  } | null
}

export function Navigation({ user }: NavigationProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="border-b border-pastel-pink bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <Link href="/dashboard" className="flex flex-shrink-0 items-center">
              <Logo size="md" />
            </Link>
            {user && (
              <div className="ml-10 flex items-center space-x-2">
                <Link
                  href="/dashboard"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive('/dashboard')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  홈
                </Link>
                <Link
                  href="/session"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    pathname.startsWith('/session')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  오늘 기록
                </Link>
                <Link
                  href="/diary"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    pathname.startsWith('/diary')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  일기
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/settings"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    pathname.startsWith('/settings')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  설정
                </Link>
                <span className="text-sm text-gray-400">{user.email}</span>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full bg-pastel-warm px-4 py-2 text-sm font-medium text-gray-600 hover:bg-pastel-pink-light transition-all"
                  >
                    로그아웃
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
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
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
