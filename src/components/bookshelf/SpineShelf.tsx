'use client'

import { motion } from 'framer-motion'
import type { DiaryWithTemplates } from '@/types/diary'
import { DiarySpine } from './DiarySpine'

interface SpineShelfProps {
  diaries: DiaryWithTemplates[]
  selectedId?: string | null
  onSelect?: (diary: DiaryWithTemplates) => void
}

export function SpineShelf({ diaries, selectedId, onSelect }: SpineShelfProps) {
  // Sort by volume number
  const sortedDiaries = [...diaries].sort((a, b) => a.volume_number - b.volume_number)

  return (
    <div className="relative py-4">
      {/* Shelf background with wood texture effect */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-b from-amber-100/50 to-amber-200/60 rounded-b-lg shadow-inner" />

      {/* Books container */}
      <motion.div
        className="flex items-end gap-1 px-4 pb-6 min-h-[220px] overflow-x-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {sortedDiaries.map((diary, index) => (
          <DiarySpine
            key={diary.id}
            diary={diary}
            index={index}
            isSelected={selectedId === diary.id}
            onClick={() => onSelect?.(diary)}
          />
        ))}

        {/* Empty state */}
        {sortedDiaries.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            아직 일기장이 없습니다
          </div>
        )}
      </motion.div>

      {/* Shelf edge with shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-b from-amber-700/20 to-amber-800/30 rounded-b-lg" />

      {/* Shelf bottom edge */}
      <div className="absolute -bottom-1 left-2 right-2 h-1 bg-amber-900/10 rounded-b-full blur-sm" />
    </div>
  )
}
