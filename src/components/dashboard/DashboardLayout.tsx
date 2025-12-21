'use client'

import { useEffect, useState } from 'react'
import { MobileSwipeView } from './MobileSwipeView'

interface DashboardLayoutProps {
  calendarContent: React.ReactNode
  mainContent: React.ReactNode
  todayEventCount?: number
}

export function DashboardLayout({ calendarContent, mainContent, todayEventCount }: DashboardLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // SSR fallback - render desktop layout initially
  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">{calendarContent}</div>
        <div className="lg:col-span-2 space-y-6">{mainContent}</div>
      </div>
    )
  }

  // Mobile: Collapsible calendar + main content
  if (isMobile) {
    return (
      <MobileSwipeView
        calendarContent={calendarContent}
        mainContent={mainContent}
        todayEventCount={todayEventCount}
      />
    )
  }

  // Desktop: Grid layout
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">{calendarContent}</div>
      <div className="lg:col-span-2 space-y-6">{mainContent}</div>
    </div>
  )
}
