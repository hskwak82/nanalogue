'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  PencilSquareIcon,
  BookOpenIcon,
  Cog6ToothIcon,
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

  const isActive = (path: string) => pathname === path
  const isActivePrefix = (path: string) => pathname.startsWith(path)

  const navItems = [
    { href: '/dashboard', label: '홈', icon: HomeIcon, exact: true },
    { href: '/session?entry=true', label: '기록', icon: PencilSquareIcon, exact: false },
    { href: '/diary', label: '일기', icon: BookOpenIcon, exact: false },
  ]

  const bottomNavItems = [
    { href: '/dashboard', label: '홈', icon: HomeIcon, exact: true },
    { href: '/session?entry=true', label: '기록', icon: PencilSquareIcon, exact: false },
    { href: '/diary', label: '일기', icon: BookOpenIcon, exact: false },
    { href: '/about', label: '소개', icon: InformationCircleIcon, exact: true },
    { href: '/announcements', label: '공지', icon: MegaphoneIcon, exact: false },
    { href: '/settings', label: '설정', icon: Cog6ToothIcon, exact: false },
  ]

  return (
    <>
      {/* Mobile Top Header - Fixed */}
      <nav className="sm:hidden fixed top-0 left-0 right-0 z-50 border-b border-pastel-pink bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between h-8 px-4">
          <Link href="/home" className="flex items-center gap-1.5">
            <svg
              width={24}
              height={24}
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="mobileNavLeafGradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#86EFAC" />
                  <stop offset="1" stopColor="#4ADE80" />
                </linearGradient>
              </defs>
              <path
                d="M24 4C24 4 8 16 8 32C8 40 16 44 24 44C32 44 40 40 40 32C40 16 24 4 24 4Z"
                fill="url(#mobileNavLeafGradient)"
              />
              <path
                d="M24 12V36M24 20L18 26M24 28L30 22"
                stroke="#FAF8F5"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-lg font-semibold text-pastel-purple-dark">
              나날로그
            </span>
          </Link>
          {user && (
            <span className="text-sm text-gray-400 truncate max-w-[140px]">
              {user.name || user.email}
            </span>
          )}
        </div>
      </nav>

      {/* Spacer for mobile top header */}
      <div className="sm:hidden h-8" />

      {/* Desktop Navigation */}
      <nav className="hidden sm:block border-b border-pastel-pink bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 justify-between">
            {/* Logo - always show icon, hide text on very small screens */}
            <div className="flex items-center flex-shrink-0">
              <Link href="/home" className="flex items-center gap-1.5 sm:gap-2">
                {/* Icon always visible */}
                <svg
                  width={28}
                  height={28}
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="flex-shrink-0 sm:w-8 sm:h-8"
                >
                  <defs>
                    <linearGradient id="navLeafGradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#86EFAC" />
                      <stop offset="1" stopColor="#4ADE80" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M24 4C24 4 8 16 8 32C8 40 16 44 24 44C32 44 40 40 40 32C40 16 24 4 24 4Z"
                    fill="url(#navLeafGradient)"
                  />
                  <path
                    d="M24 12V36M24 20L18 26M24 28L30 22"
                    stroke="#FAF8F5"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Text - always visible */}
                <span className="text-lg sm:text-xl font-semibold text-pastel-purple-dark whitespace-nowrap">
                  나날로그
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            {user && (
              <div className="hidden sm:flex items-center space-x-1 lg:space-x-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 lg:px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
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


          {/* Right side - Desktop */}
          <div className="hidden sm:flex items-center space-x-2 lg:space-x-4">
            {user ? (
              <>
                <Link
                  href="/about"
                  className={`rounded-full px-3 lg:px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                    isActive('/about')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  소개
                </Link>
                <Link
                  href="/announcements"
                  className={`rounded-full px-3 lg:px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                    isActive('/announcements')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  공지
                </Link>
                <Link
                  href="/settings"
                  className={`rounded-full px-3 lg:px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
                    isActivePrefix('/settings')
                      ? 'bg-pastel-purple-light text-pastel-purple-dark'
                      : 'text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark'
                  }`}
                >
                  설정
                </Link>
                <span className="text-sm text-gray-400 max-w-[120px] lg:max-w-[150px] truncate">{user.name || user.email}</span>
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

        </div>
      </div>
    </nav>

      {/* Mobile Bottom Navigation Bar */}
      {user && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-pastel-pink shadow-lg safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-2">
            {bottomNavItems.map((item) => {
              const Icon = item.icon
              const active = item.exact
                ? isActive(item.href) || (item.href === '/dashboard' && isActive('/'))
                : isActivePrefix(item.href.split('?')[0])
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all ${
                    active
                      ? 'text-pastel-purple-dark'
                      : 'text-gray-400 hover:text-pastel-purple'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${active ? 'stroke-2' : ''}`} />
                  <span className={`text-[10px] mt-1 ${active ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      {/* Spacer for bottom navigation on mobile */}
      {user && <div className="sm:hidden h-16" />}
    </>
  )
}
