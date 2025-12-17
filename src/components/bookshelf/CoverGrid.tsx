'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { DiaryWithTemplates } from '@/types/diary'
import { formatDateRange } from '@/types/diary'
import { DiaryCover } from '@/components/diary/DiaryCover'

interface CoverGridProps {
  diaries: DiaryWithTemplates[]
  selectedId?: string | null
  activeDiaryId?: string | null
  onSelect?: (diary: DiaryWithTemplates) => void
}

export function CoverGrid({ diaries, selectedId, activeDiaryId, onSelect }: CoverGridProps) {
  // Sort by volume number descending (newest first)
  const sortedDiaries = [...diaries].sort((a, b) => b.volume_number - a.volume_number)

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {sortedDiaries.map((diary, index) => (
        <motion.div
          key={diary.id}
          layoutId={`diary-cover-${diary.id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: index * 0.05,
            duration: 0.3,
          }}
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect?.(diary)}
          className={`cursor-pointer group flex flex-col items-center ${
            selectedId === diary.id ? 'ring-2 ring-pastel-purple ring-offset-2 rounded-lg' : ''
          }`}
        >
          <div className="relative w-fit">
            {/* Cover */}
            <DiaryCover
              template={diary.cover_template}
              decorations={diary.cover_decorations}
              size="preview"
            />

            {/* Volume badge */}
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm">
              {diary.volume_number}권
            </div>

            {/* Active indicator */}
            {activeDiaryId === diary.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-3 h-3 bg-pastel-mint rounded-full border-2 border-white shadow-sm"
                title="현재 사용 중"
              />
            )}

            {/* Completed badge */}
            {diary.status === 'completed' && (
              <div className="absolute top-2 right-2 bg-pastel-purple/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                완료
              </div>
            )}

          </div>

          {/* Info below cover */}
          <div className="mt-2 text-center max-w-[120px]">
            <p className="text-xs text-gray-700 font-medium truncate">
              {diary.title || `${diary.volume_number}권`}
            </p>
            <p className="text-[10px] text-gray-500">
              {formatDateRange(diary.start_date, diary.end_date)}
            </p>
            {diary.entry_count !== undefined && diary.entry_count > 0 && (
              <p className="text-[10px] text-gray-400">{diary.entry_count}개 기록</p>
            )}
          </div>
        </motion.div>
      ))}

      {/* Empty state */}
      {sortedDiaries.length === 0 && (
        <div className="col-span-full flex items-center justify-center py-12 text-gray-400 text-sm">
          아직 일기장이 없습니다
        </div>
      )}
    </motion.div>
  )
}
