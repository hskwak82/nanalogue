'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartBarIcon,
  UsersIcon,
  CreditCardIcon,
  CubeIcon,
  ArrowLeftIcon,
  SwatchIcon,
  SparklesIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { href: '/settings/admin', label: '대시보드', icon: ChartBarIcon },
  { href: '/settings/admin/users', label: '사용자', icon: UsersIcon },
  { href: '/settings/admin/payments', label: '결제', icon: CreditCardIcon },
  { href: '/settings/admin/plans', label: '플랜', icon: CubeIcon },
  { href: '/settings/admin/templates', label: '템플릿', icon: SwatchIcon },
  { href: '/settings/admin/decorations', label: '데코레이션', icon: SparklesIcon },
  { href: '/settings/admin/announcements', label: '공지사항', icon: MegaphoneIcon },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="w-full lg:w-48 shrink-0">
      <div className="sticky top-4 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          설정으로 돌아가기
        </Link>

        {navItems.map((item) => {
          const isActive =
            item.href === '/settings/admin'
              ? pathname === '/settings/admin'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
