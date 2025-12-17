'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/login/actions'
import { Logo } from './Logo'
import {
  HomeIcon,
  PencilSquareIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  InformationCircleIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline'

interface NavigationProps {
  user: {
    email?: string
    name?: string
  } | null
}

export function Navigation({ user }: NavigationProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path
  const isActivePrefix = (path: string) => pathname.startsWith(path)

  const navItems = [
    { href: '/dashboard', label: '홈', icon: HomeIcon, exact: true },
    { href: '/session', label: '기록', icon: PencilSquareIcon, exact: false },
    { href: '/diary', label: '일기', icon: BookOpenIcon, exact: false },
  ]

  return (
    <nav className="border-b border-pastel-pink bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/home" className="flex flex-shrink-0 items-center">
              <Logo size="md" className="hidden sm:block" />
              <Logo size="sm" className="block sm:hidden" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden sm:flex items-center space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    (item.exact ? isActive(item.href) : isActivePrefix(item.href))
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Mobile Navigation - Icon based */}
          {user && (
            <div className="flex sm:hidden items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = item.exact ? isActive(item.href) : isActivePrefix(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`p-2 rounded-full transition-all ${
                      active
                        ? 'bg-pastel-purple-light text-pastel-purple-dark'
                        : 'text-gray-400 hover:text-pastel-purple-dark'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                )
              })}
            </div>
          )}

          {/* Right side - Desktop */}
          <div className="hidden sm:flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/about"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive('/about')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  소개
                </Link>
                <Link
                  href="/announcements"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive('/announcements')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  공지
                </Link>
                <Link
                  href="/settings"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActivePrefix('/settings')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  설정
                </Link>
                <span className="text-sm text-gray-400 max-w-[150px] truncate">{user.email}</span>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full bg-pastel-warm px-4 py-2 text-sm font-medium text-gray-600 hover:bg-pastel-pink-light transition-all"
                  >
                    로그아웃
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/about"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/about')
                      ? 'text-pastel-purple-dark'
                      : 'text-gray-500 hover:text-pastel-purple-dark'
                  }`}
                >
                  소개
                </Link>
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

          {/* Right side - Mobile */}
          <div className="flex sm:hidden items-center">
            {user ? (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-full text-gray-400 hover:text-pastel-purple-dark transition-all"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="w-5 h-5" />
                ) : (
                  <Cog6ToothIcon className="w-5 h-5" />
                )}
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/about"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/about')
                      ? 'text-pastel-purple-dark'
                      : 'text-gray-500 hover:text-pastel-purple-dark'
                  }`}
                >
                  소개
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
                >
                  로그인
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {user && mobileMenuOpen && (
        <div className="sm:hidden border-t border-pastel-pink/50 bg-white/95 backdrop-blur-sm">
          <div className="px-4 py-3 space-y-2">
            <div className="text-xs text-gray-400 truncate mb-2">{user.email}</div>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/about')
                  ? 'bg-pastel-purple-light text-pastel-purple-dark'
                  : 'text-gray-600 hover:bg-pastel-pink-light'
              }`}
            >
              <InformationCircleIcon className="w-4 h-4" />
              소개
            </Link>
            <Link
              href="/announcements"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/announcements')
                  ? 'bg-pastel-purple-light text-pastel-purple-dark'
                  : 'text-gray-600 hover:bg-pastel-pink-light'
              }`}
            >
              <MegaphoneIcon className="w-4 h-4" />
              공지사항
            </Link>
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActivePrefix('/settings')
                  ? 'bg-pastel-purple-light text-pastel-purple-dark'
                  : 'text-gray-600 hover:bg-pastel-pink-light'
              }`}
            >
              <Cog6ToothIcon className="w-4 h-4" />
              설정
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-pastel-pink-light transition-all text-left"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  )
}
