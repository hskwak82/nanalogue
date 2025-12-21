'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiaryWithTemplates } from '@/types/diary'
import { DiaryCover } from '@/components/diary/DiaryCover'
import { getSpinePreset, getSpineBackgroundStyle, getSpineBandStyles } from '@/lib/spine-renderer'
import { BOOKSHELF_SPINE_WIDTH_RATIO, PRINT_SPECS } from '@/lib/publishing/print-constants'

// Calculate bookshelf spine dimensions for display
// Spine height 140px, aspect ratio 0.72, display ratio 30% (wider than print for readability)
const BOOKSHELF_SPINE_HEIGHT = 140
const BOOKSHELF_SPINE_WIDTH = Math.round(BOOKSHELF_SPINE_HEIGHT * PRINT_SPECS.PRINT_ASPECT_RATIO * BOOKSHELF_SPINE_WIDTH_RATIO)

interface CustomizeBookshelfProps {
  diaries: DiaryWithTemplates[]
  activeDiaryId?: string | null
  selectedDiaryId: string | null
  onSelectDiary: (diary: DiaryWithTemplates) => void
  onCustomize?: (diary: DiaryWithTemplates) => void
}

// Mini spine component for the shelf - uses preset-based styling
function MiniSpine({
  diary,
  isActive,
  isSelected,
  onClick
}: {
  diary: DiaryWithTemplates
  isActive: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const title = diary.title || `${diary.volume_number}권`
  const preset = getSpinePreset(diary.spine_preset_id)
  const bandStyles = getSpineBandStyles(preset)

  return (
    <motion.div
      layoutId={`customize-spine-${diary.id}`}
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

      {/* Spine edges for book effect */}
      <div className="absolute left-0 top-0 bottom-0 w-[1px] z-10" style={{ background: 'rgba(0,0,0,0.15)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-[1px] z-10" style={{ background: 'rgba(255,255,255,0.2)' }} />

      {/* Title - always displayed */}
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

export function CustomizeBookshelf({
  diaries,
  activeDiaryId,
  selectedDiaryId,
  onSelectDiary,
  onCustomize
}: CustomizeBookshelfProps) {
  // Currently displayed diary (cover view)
  const [displayedDiaryId, setDisplayedDiaryId] = useState<string | null>(selectedDiaryId)

  // Sync with selected diary from parent
  useEffect(() => {
    if (selectedDiaryId) {
      setDisplayedDiaryId(selectedDiaryId)
    }
  }, [selectedDiaryId])

  const displayedDiary = diaries.find(d => d.id === displayedDiaryId)
  // Show ALL diaries in shelf (don't filter out the displayed one)
  const shelfDiaries = [...diaries].sort((a, b) => a.volume_number - b.volume_number)

  const handleSpineClick = (diary: DiaryWithTemplates) => {
    setDisplayedDiaryId(diary.id)
  }

  const handleCustomize = () => {
    if (displayedDiary) {
      onSelectDiary(displayedDiary)
      onCustomize?.(displayedDiary)
    }
  }

  if (diaries.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📚</span>
        <h2 className="text-lg font-semibold text-gray-700">책장</h2>
      </div>

      {/* Main content: Cover + Shelf */}
      <div className="flex items-start gap-6">
        {/* Cover display */}
        <div className="flex flex-col items-center gap-2">
          <AnimatePresence mode="wait">
            {displayedDiary && (
              <motion.div
                key={displayedDiary.id}
                layoutId={`customize-cover-main-${displayedDiary.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="group cursor-pointer"
                onClick={handleCustomize}
              >
                <div className="relative transition-all duration-200 group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-xl">
                  <DiaryCover
                    template={displayedDiary.cover_template}
                    decorations={displayedDiary.cover_decorations}
                    coverImageUrl={displayedDiary.cover_image_url}
                    size="preview"
                  />
                  {/* Customize overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                    <span className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                      꾸미기
                    </span>
                  </div>
                </div>
                {/* Title below cover */}
                <p className="mt-2 text-xs text-gray-600 font-medium text-center truncate max-w-[120px]">
                  {displayedDiary.title || `${displayedDiary.volume_number}권`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mini bookshelf with all diaries */}
        {shelfDiaries.length > 0 && (
          <div className="flex-1 relative min-w-0">
            {/* Shelf */}
            <div className="relative pb-3">
              {/* Books - scrollable container */}
              <div className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent pb-2 pt-4">
                <div className="flex items-end gap-1 min-h-[160px]" style={{ perspective: '800px' }}>
                  {shelfDiaries.map((diary) => (
                    <MiniSpine
                      key={diary.id}
                      diary={diary}
                      isActive={diary.id === activeDiaryId}
                      isSelected={diary.id === displayedDiaryId}
                      onClick={() => handleSpineClick(diary)}
                    />
                  ))}
                </div>
              </div>

              {/* Shelf surface */}
              <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-b from-amber-100/60 to-amber-200/70 rounded-b shadow-inner" />
              <div className="absolute -bottom-1 left-1 right-1 h-1 bg-amber-900/10 rounded-full blur-sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
