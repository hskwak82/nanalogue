'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'

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
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <Link href="/dashboard" className="flex flex-shrink-0 items-center">
              <span className="text-xl font-bold text-indigo-600">나날로그</span>
            </Link>
            {user && (
              <div className="ml-10 flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    isActive('/dashboard')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  홈
                </Link>
                <Link
                  href="/session"
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    pathname.startsWith('/session')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  오늘 기록
                </Link>
                <Link
                  href="/diary"
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    pathname.startsWith('/diary')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
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
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    pathname.startsWith('/settings')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  설정
                </Link>
                <span className="text-sm text-gray-500">{user.email}</span>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    로그아웃
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-x-4">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
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
