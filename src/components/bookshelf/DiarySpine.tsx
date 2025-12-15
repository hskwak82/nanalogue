'use client'

import { motion } from 'framer-motion'
import type { DiaryWithTemplates } from '@/types/diary'
import { formatDateRange } from '@/types/diary'
import { useSpineCalculations } from './hooks/useSpineCalculations'

interface DiarySpineProps {
  diary: DiaryWithTemplates
  index: number
  isSelected?: boolean
  onClick?: () => void
}

export function DiarySpine({ diary, index, isSelected, onClick }: DiarySpineProps) {
  const { width, height, color, gradient, textColor } = useSpineCalculations(diary)

  const background = gradient || color

  return (
    <motion.div
      layoutId={`diary-spine-${diary.id}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.05,
        duration: 0.3,
        layout: { type: 'spring', stiffness: 300, damping: 30 },
      }}
      whileHover={{
        scale: 1.03,
        rotateY: -8,
        z: 20,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-sm shadow-md ${
        isSelected ? 'ring-2 ring-pastel-purple ring-offset-2' : ''
      }`}
      style={{
        width,
        height,
        background,
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Spine edge highlight (left) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-sm"
        style={{ background: 'rgba(0,0,0,0.15)' }}
      />

      {/* Spine edge highlight (right) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[1px]"
        style={{ background: 'rgba(255,255,255,0.3)' }}
      />

      {/* Content container */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-between py-3 px-1 overflow-hidden"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
        }}
      >
        {/* Volume number at top */}
        <span
          className="text-xs font-bold opacity-70 shrink-0"
          style={{ color: textColor }}
        >
          {diary.volume_number}
        </span>

        {/* Title in middle */}
        <span
          className="font-medium text-sm flex-1 flex items-center overflow-hidden"
          style={{
            color: textColor,
            maxHeight: height - 80,
          }}
        >
          <span className="truncate">
            {diary.title || `${diary.volume_number}권`}
          </span>
        </span>

        {/* Date range at bottom */}
        <span
          className="text-[9px] opacity-60 shrink-0 whitespace-nowrap"
          style={{ color: textColor }}
        >
          {new Date(diary.start_date).getFullYear()}
        </span>
      </div>

      {/* Status indicator for active diary */}
      {diary.status === 'active' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-pastel-mint rounded-full border-2 border-white shadow-sm"
          title="현재 사용 중"
        />
      )}

      {/* Hover tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileHover={{ opacity: 1, y: 0 }}
        className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none"
      >
        <div className="font-medium">{diary.title || `${diary.volume_number}권`}</div>
        <div className="text-gray-300 text-[10px]">
          {formatDateRange(diary.start_date, diary.end_date)}
        </div>
        {diary.entry_count !== undefined && (
          <div className="text-gray-400 text-[10px]">{diary.entry_count}개 기록</div>
        )}
        {/* Tooltip arrow */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45" />
      </motion.div>
    </motion.div>
  )
}
