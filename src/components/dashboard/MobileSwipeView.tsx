'use client'

import { useState } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'

interface MobileSwipeViewProps {
  calendarContent: React.ReactNode
  mainContent: React.ReactNode
}

const SWIPE_THRESHOLD = 50

export function MobileSwipeView({ calendarContent, mainContent }: MobileSwipeViewProps) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'diary'>(
    'diary'
  )

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      if (info.offset.x > 0 && activeTab === 'diary') {
        setActiveTab('calendar')
      } else if (info.offset.x < 0 && activeTab === 'calendar') {
        setActiveTab('diary')
      }
    }
  }

  return (
    <div className="w-full">
      {/* Tab indicators */}
      <div className="flex justify-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'calendar'
              ? 'bg-pastel-purple text-white'
              : 'bg-white/50 text-gray-500'
          }`}
        >
          달력
        </button>
        <button
          onClick={() => setActiveTab('diary')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'diary'
              ? 'bg-pastel-purple text-white'
              : 'bg-white/50 text-gray-500'
          }`}
        >
          일기장
        </button>
      </div>

      {/* Swipe indicator dots */}
      <div className="flex justify-center gap-2 mb-4">
        <div
          className={`w-2 h-2 rounded-full transition-colors ${
            activeTab === 'calendar' ? 'bg-pastel-purple' : 'bg-gray-300'
          }`}
        />
        <div
          className={`w-2 h-2 rounded-full transition-colors ${
            activeTab === 'diary' ? 'bg-pastel-purple' : 'bg-gray-300'
          }`}
        />
      </div>

      {/* Swipeable content */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{
              x: activeTab === 'calendar' ? -300 : 300,
              opacity: 0
            }}
            animate={{
              x: 0,
              opacity: 1
            }}
            exit={{
              x: activeTab === 'calendar' ? 300 : -300,
              opacity: 0
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full touch-pan-y"
          >
            {activeTab === 'calendar' ? (
              <div className="space-y-6">
                {calendarContent}
              </div>
            ) : (
              <div className="space-y-6">
                {mainContent}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Swipe hint */}
      <p className="text-center text-xs text-gray-400 mt-4">
        좌우로 스와이프하여 전환
      </p>
    </div>
  )
}
