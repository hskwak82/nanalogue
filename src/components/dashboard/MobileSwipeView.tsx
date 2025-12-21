'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileSwipeViewProps {
  calendarContent: React.ReactNode
  mainContent: React.ReactNode
  todayEventCount?: number
}

export function MobileSwipeView({
  calendarContent,
  mainContent,
  todayEventCount = 0
}: MobileSwipeViewProps) {
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false)

  // Get current month name
  const currentMonth = new Date().toLocaleDateString('ko-KR', { month: 'long' })

  return (
    <div className="w-full space-y-4">
      {/* Calendar Accordion */}
      <div className="rounded-2xl bg-white/70 backdrop-blur-sm shadow-sm border border-pastel-pink/30 overflow-hidden">
        {/* Accordion Header */}
        <button
          onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-pastel-pink-light/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <span className="font-medium text-gray-700">{currentMonth} 달력</span>
            {!isCalendarExpanded && todayEventCount > 0 && (
              <span className="text-xs text-pastel-purple bg-pastel-purple/10 px-2 py-0.5 rounded-full">
                오늘 {todayEventCount}개
              </span>
            )}
          </div>
          <motion.span
            animate={{ rotate: isCalendarExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.span>
        </button>

        {/* Accordion Content */}
        <AnimatePresence initial={false}>
          {isCalendarExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                {calendarContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content (always visible) */}
      <div className="space-y-6">
        {mainContent}
      </div>
    </div>
  )
}
