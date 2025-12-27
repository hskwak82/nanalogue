'use client'

import { MobileSwipeView } from './MobileSwipeView'

interface DashboardLayoutProps {
  calendarContent: React.ReactNode
  mainContent: React.ReactNode
  todayEventCount?: number
}

export function DashboardLayout({ calendarContent, mainContent, todayEventCount }: DashboardLayoutProps) {
  // Always use collapsible vertical layout for all screen sizes
  return (
    <MobileSwipeView
      calendarContent={calendarContent}
      mainContent={mainContent}
      todayEventCount={todayEventCount}
    />
  )
}
