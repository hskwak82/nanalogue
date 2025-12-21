'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import type { DiaryWithTemplates, BookshelfViewMode } from '@/types/diary'
import { formatDateRange } from '@/types/diary'
import { DiaryCover } from '@/components/diary/DiaryCover'
import { getSpinePreset, getSpineBackgroundStyle, getSpineBandStyles } from '@/lib/spine-renderer'
import { BOOKSHELF_SPINE_WIDTH_RATIO, PRINT_SPECS } from '@/lib/publishing/print-constants'

// Spine dimensions
const BOOKSHELF_SPINE_HEIGHT = 140
const BOOKSHELF_SPINE_WIDTH = Math.round(BOOKSHELF_SPINE_HEIGHT * PRINT_SPECS.PRINT_ASPECT_RATIO * BOOKSHELF_SPINE_WIDTH_RATIO)

// Cover preview height (120 / 0.72 aspect ratio = ~167px)
const COVER_PREVIEW_HEIGHT = 167

interface UnifiedBookshelfProps {
  diaries: DiaryWithTemplates[]
  selectedDiaryId: string | null
  activeDiaryId?: string | null
  onSelectDiary: (diary: DiaryWithTemplates) => void
  onCoverClick?: (diary: DiaryWithTemplates) => void
  showCustomizeLink?: boolean
  showBookshelfLink?: boolean
  showEditButton?: boolean
  onEditDiary?: (diary: DiaryWithTemplates) => void
  layoutId?: string // Unique layout ID prefix for framer-motion
}

// ViewToggle component
function ViewToggle({
  mode,
  onChange
}: {
  mode: BookshelfViewMode
  onChange: (mode: BookshelfViewMode) => void
}) {
  return (
    <div className="flex items-center gap-1 bg-white/70 rounded-full p-1 shadow-sm">
      <button
        onClick={() => onChange('covers')}
        className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          mode === 'covers' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        {mode === 'covers' && (
          <motion.div
            layoutId="bookshelfViewToggle"
            className="absolute inset-0 bg-pastel-purple rounded-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="3" width="7" height="10" rx="1" strokeWidth="2" />
            <rect x="14" y="3" width="7" height="10" rx="1" strokeWidth="2" />
          </svg>
          표지
        </span>
      </button>

      <button
        onClick={() => onChange('spines')}
        className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          mode === 'spines' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        {mode === 'spines' && (
          <motion.div
            layoutId="bookshelfViewToggle"
            className="absolute inset-0 bg-pastel-purple rounded-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="4" width="3" height="16" rx="0.5" strokeWidth="2" />
            <rect x="8" y="4" width="4" height="16" rx="0.5" strokeWidth="2" />
            <rect x="14" y="4" width="2" height="16" rx="0.5" strokeWidth="2" />
          </svg>
          책장
        </span>
      </button>
    </div>
  )
}

// Cover card for cover view
function CoverCard({
  diary,
  isSelected,
  onClick,
  layoutId
}: {
  diary: DiaryWithTemplates
  isSelected: boolean
  onClick: () => void
  layoutId: string
}) {
  return (
    <motion.div
      layoutId={`${layoutId}-cover-${diary.id}`}
      animate={{
        scale: isSelected ? 1.05 : 1,
        y: isSelected ? -5 : 0,
      }}
      whileHover={!isSelected ? { scale: 1.03, y: -3 } : undefined}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`cursor-pointer flex-shrink-0 flex flex-col items-center ${
        isSelected ? 'z-10' : ''
      }`}
    >
      <div className={`relative ${isSelected ? 'ring-2 ring-pastel-purple ring-offset-2 rounded-lg shadow-xl' : ''}`}>
        <DiaryCover
          template={diary.cover_template}
          decorations={diary.cover_decorations}
          coverImageUrl={diary.cover_image_url}
          size="preview"
        />
        {/* Volume badge */}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm">
          {diary.volume_number}권
        </div>
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
      </div>
    </motion.div>
  )
}

// Mini spine for spine view
function MiniSpine({
  diary,
  isActive,
  isSelected,
  onClick,
  layoutId
}: {
  diary: DiaryWithTemplates
  isActive: boolean
  isSelected: boolean
  onClick: () => void
  layoutId: string
}) {
  const title = diary.title || `${diary.volume_number}권`
  const preset = getSpinePreset(diary.spine_preset_id)
  const bandStyles = getSpineBandStyles(preset)

  return (
    <motion.div
      layoutId={`${layoutId}-spine-${diary.id}`}
      animate={{
        y: isSelected ? 0 : 8,
      }}
      whileHover={!isSelected ? { y: 0 } : undefined}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-sm flex-shrink-0 overflow-hidden ${
        isSelected ? 'shadow-xl ring-2 ring-pastel-purple z-10' : 'shadow-md'
      }`}
      style={{
        width: BOOKSHELF_SPINE_WIDTH,
        height: BOOKSHELF_SPINE_HEIGHT,
        transformStyle: 'preserve-3d',
        ...getSpineBackgroundStyle(preset),
      }}
    >
      {/* Top band */}
      {bandStyles.topBand && <div style={bandStyles.topBand} />}

      {/* Bottom band */}
      {bandStyles.bottomBand && <div style={bandStyles.bottomBand} />}

      {/* Active indicator */}
      {isActive && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pastel-mint rounded-full shadow-sm z-20" />
      )}

      {/* Spine edges */}
      <div className="absolute left-0 top-0 bottom-0 w-[1px] z-10" style={{ background: 'rgba(0,0,0,0.15)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-[1px] z-10" style={{ background: 'rgba(255,255,255,0.2)' }} />

      {/* Title */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-1 z-10">
        <span
          className="text-[8px] font-medium text-center drop-shadow-sm"
          style={{
            color: preset.textColor,
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            letterSpacing: '-0.02em',
            textShadow: '0 1px 2px rgba(255,255,255,0.3), 0 -1px 2px rgba(255,255,255,0.3)',
          }}
        >
          {title.length > 12 ? title.slice(0, 12) + '..' : title}
        </span>
      </div>
    </motion.div>
  )
}

export function UnifiedBookshelf({
  diaries,
  selectedDiaryId,
  activeDiaryId,
  onSelectDiary,
  onCoverClick,
  showCustomizeLink = false,
  showBookshelfLink = false,
  showEditButton = false,
  onEditDiary,
  layoutId = 'unified'
}: UnifiedBookshelfProps) {
  const [viewMode, setViewMode] = useState<BookshelfViewMode>('spines')

  const selectedDiary = diaries.find(d => d.id === selectedDiaryId)
  const sortedDiaries = [...diaries].sort((a, b) => a.volume_number - b.volume_number)

  const handleCoverClick = () => {
    if (selectedDiary && onCoverClick) {
      onCoverClick(selectedDiary)
    }
  }

  if (diaries.length === 0) {
    return (
      <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📔</div>
          <p className="text-gray-500">아직 일기장이 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-4 sm:p-6 shadow-sm border border-pastel-pink/30 overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <h2 className="text-base sm:text-lg font-semibold text-gray-700">책장</h2>
          <span className="text-sm text-gray-400">{diaries.length}권</span>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          {showBookshelfLink && (
            <Link
              href="/bookshelf"
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap hidden sm:block"
            >
              전체보기
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
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
              {/* Horizontal scrollable cover grid */}
              <div className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-pastel-purple/30 scrollbar-track-transparent">
                <div className="inline-flex items-start gap-4 min-h-[220px] pt-4 pb-6 px-4 sm:px-6">
                  {sortedDiaries.map((diary) => (
                    <CoverCard
                      key={diary.id}
                      diary={diary}
                      isSelected={diary.id === selectedDiaryId}
                      onClick={() => onSelectDiary(diary)}
                      layoutId={layoutId}
                    />
                  ))}
                </div>
              </div>
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
              {/* Cover + Spine shelf layout - bottoms aligned */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                {/* Cover display */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <AnimatePresence mode="wait">
                    {selectedDiary && (
                      <motion.div
                        key={selectedDiary.id}
                        layoutId={`${layoutId}-main-cover-${selectedDiary.id}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className={onCoverClick ? 'cursor-pointer group' : ''}
                        onClick={handleCoverClick}
                      >
                        <div className={`relative ${onCoverClick ? 'transition-all duration-200 group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-xl' : ''}`}>
                          <DiaryCover
                            template={selectedDiary.cover_template}
                            decorations={selectedDiary.cover_decorations}
                            coverImageUrl={selectedDiary.cover_image_url}
                            size="preview"
                          />
                          {onCoverClick && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                              <span className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                                보기
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-gray-600 font-medium text-center truncate max-w-[120px]">
                          {selectedDiary.title || `${selectedDiary.volume_number}권`}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Spine shelf - aligned to cover bottom */}
                <div className="flex-1 relative min-w-0 w-full self-end">
                  <div className="relative" style={{ paddingBottom: '12px' }}>
                    <div className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent">
                      <div className="inline-flex items-end gap-1 px-1" style={{
                        minHeight: BOOKSHELF_SPINE_HEIGHT + 16,
                        paddingTop: '16px',
                        paddingBottom: '8px'
                      }}>
                        {sortedDiaries.map((diary) => (
                          <MiniSpine
                            key={diary.id}
                            diary={diary}
                            isActive={diary.id === activeDiaryId}
                            isSelected={diary.id === selectedDiaryId}
                            onClick={() => onSelectDiary(diary)}
                            layoutId={layoutId}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Shelf surface */}
                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-b from-amber-100/60 to-amber-200/70 rounded-b shadow-inner" />
                    <div className="absolute -bottom-1 left-1 right-1 h-1 bg-amber-900/10 rounded-full blur-sm" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* Footer - Selected diary info */}
      {selectedDiary && (
        <div className="mt-4 pt-3 border-t border-pastel-pink/30 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-gray-600 truncate">
              <span className="font-medium">{selectedDiary.title || `${selectedDiary.volume_number}권`}</span>
            </span>
            {showEditButton && onEditDiary && (
              <button
                onClick={() => onEditDiary(selectedDiary)}
                className="text-gray-400 hover:text-pastel-purple transition-colors flex-shrink-0"
                title="이름 수정"
              >
                ✏️
              </button>
            )}
          </div>
          {showCustomizeLink && (
            <Link
              href={`/customize?diary=${selectedDiary.id}`}
              className="text-xs font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
            >
              꾸미기
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
