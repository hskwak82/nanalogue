'use client'

import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import type { DiaryWithTemplates, BookshelfViewMode } from '@/types/diary'
import { ViewToggle } from './ViewToggle'
import { CoverGrid } from './CoverGrid'
import { SpineShelf } from './SpineShelf'

interface BookshelfProps {
  diaries: DiaryWithTemplates[]
  onSelectDiary?: (diary: DiaryWithTemplates) => void
  onCreateNew?: () => void
  onEdit?: (diary: DiaryWithTemplates) => void
  isAdmin?: boolean
}

export function Bookshelf({
  diaries,
  onSelectDiary,
  onCreateNew,
  onEdit,
  isAdmin = false,
}: BookshelfProps) {
  const [viewMode, setViewMode] = useState<BookshelfViewMode>('covers')
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null)

  const handleSelectDiary = (diary: DiaryWithTemplates) => {
    setSelectedDiaryId(diary.id)
    onSelectDiary?.(diary)
  }

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-700">나의 일기장</h2>
          <span className="text-sm text-gray-400">
            {diaries.length}권
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ViewToggle mode={viewMode} onChange={setViewMode} />

          {isAdmin && onCreateNew && (
            <button
              onClick={onCreateNew}
              className="flex items-center gap-1.5 px-3 py-2 bg-pastel-purple text-white text-sm font-medium rounded-full hover:bg-pastel-purple-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 일기장
            </button>
          )}
        </div>
      </div>

      {/* Content with animation */}
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {viewMode === 'covers' ? (
            <motion.div
              key="covers"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <CoverGrid
                diaries={diaries}
                selectedId={selectedDiaryId}
                onSelect={handleSelectDiary}
              />
            </motion.div>
          ) : (
            <motion.div
              key="spines"
              initial={{ opacity: 0, rotateY: -10 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ perspective: '1000px' }}
            >
              <SpineShelf
                diaries={diaries}
                selectedId={selectedDiaryId}
                onSelect={handleSelectDiary}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* Empty state */}
      {diaries.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📔</div>
          <p className="text-gray-500 mb-4">
            {isAdmin ? '아직 일기장이 없습니다' : '일기를 작성하면 자동으로 일기장이 생성됩니다'}
          </p>
          {isAdmin && onCreateNew && (
            <button
              onClick={onCreateNew}
              className="px-6 py-2 bg-pastel-purple text-white rounded-full hover:bg-pastel-purple-dark transition-colors"
            >
              첫 번째 일기장 만들기
            </button>
          )}
        </div>
      )}
    </div>
  )
}
