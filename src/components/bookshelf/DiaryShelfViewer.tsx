'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiaryWithTemplates } from '@/types/diary'
import { DiaryCover } from '@/components/diary/DiaryCover'
import { useSpineCalculations } from './hooks/useSpineCalculations'

interface DiaryShelfViewerProps {
  diaries: DiaryWithTemplates[]
  activeDiaryId?: string | null
  onSelectDiary?: (diary: DiaryWithTemplates) => void
  onEditDiary?: (diary: DiaryWithTemplates) => void
  onActivateDiary?: (diary: DiaryWithTemplates) => void
}

// Parse cover image_url which can be gradient, solid, or actual URL
function parseImageUrl(imageUrl: string): {
  type: 'gradient' | 'solid' | 'image'
  value: string
} {
  if (imageUrl.startsWith('gradient:')) {
    return { type: 'gradient', value: imageUrl.replace('gradient:', '') }
  }
  if (imageUrl.startsWith('solid:')) {
    return { type: 'solid', value: imageUrl.replace('solid:', '') }
  }
  return { type: 'image', value: imageUrl }
}

// Mini spine component for the shelf - matches cover design
function MiniSpine({
  diary,
  isActive,
  onClick
}: {
  diary: DiaryWithTemplates
  isActive: boolean
  onClick: () => void
}) {
  const { textColor } = useSpineCalculations(diary)
  const title = diary.title || `${diary.volume_number}권`

  // Get cover style - show LEFT portion of cover (like real book spine)
  const getCoverStyle = () => {
    // If pre-rendered cover image exists, show left edge
    if (diary.cover_image_url) {
      return {
        backgroundImage: `url(${diary.cover_image_url})`,
        backgroundSize: 'auto 100%', // Height 100%, width auto to maintain aspect ratio
        backgroundPosition: 'left center', // Show left portion
      }
    }

    // Use template if available
    if (diary.cover_template?.image_url) {
      const parsed = parseImageUrl(diary.cover_template.image_url)
      switch (parsed.type) {
        case 'gradient':
          return { background: parsed.value }
        case 'solid':
          return { backgroundColor: parsed.value }
        case 'image':
          return {
            backgroundImage: `url(${parsed.value})`,
            backgroundSize: 'auto 100%',
            backgroundPosition: 'left center',
          }
      }
    }

    // Fallback: use spine_gradient or spine_color
    if (diary.spine_gradient) {
      return { background: diary.spine_gradient }
    }
    if (diary.spine_color) {
      return { backgroundColor: diary.spine_color }
    }

    // Default pastel lavender
    return { background: 'linear-gradient(135deg, #E8E0F0 0%, #D4C5E2 50%, #C9B8DA 100%)' }
  }

  return (
    <motion.div
      layoutId={`diary-spine-${diary.id}`}
      whileHover={{ scale: 1.05, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative cursor-pointer rounded-sm shadow-md flex-shrink-0 overflow-hidden"
      style={{
        width: 32,
        height: 140,
        ...getCoverStyle(),
      }}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pastel-mint rounded-full shadow-sm z-20" />
      )}

      {/* Spine edges for book effect */}
      <div className="absolute left-0 top-0 bottom-0 w-[1px] z-10" style={{ background: 'rgba(0,0,0,0.15)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-[1px] z-10" style={{ background: 'rgba(255,255,255,0.2)' }} />

      {/* Title overlay with semi-transparent background for readability */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-1 z-10">
        <span
          className="text-[11px] font-medium text-center drop-shadow-sm"
          style={{
            color: textColor,
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            letterSpacing: '0.05em',
            textShadow: '0 1px 2px rgba(255,255,255,0.5), 0 -1px 2px rgba(255,255,255,0.5)',
          }}
        >
          {title.length > 6 ? title.slice(0, 6) + '..' : title}
        </span>
      </div>
    </motion.div>
  )
}

const SELECTED_DIARY_KEY = 'nanalogue_selected_diary'

export function DiaryShelfViewer({
  diaries,
  activeDiaryId,
  onSelectDiary,
  onEditDiary,
  onActivateDiary
}: DiaryShelfViewerProps) {
  // Currently displayed diary (cover view)
  const [displayedDiaryId, setDisplayedDiaryId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize from localStorage or active diary
  useEffect(() => {
    if (isInitialized || diaries.length === 0) return

    // Try to load from localStorage first
    const savedId = localStorage.getItem(SELECTED_DIARY_KEY)
    const savedDiaryExists = savedId && diaries.some(d => d.id === savedId)

    if (savedDiaryExists) {
      setDisplayedDiaryId(savedId)
    } else if (activeDiaryId) {
      setDisplayedDiaryId(activeDiaryId)
    } else {
      setDisplayedDiaryId(diaries[0].id)
    }

    setIsInitialized(true)
  }, [activeDiaryId, diaries, isInitialized])

  // Save to localStorage when selection changes
  useEffect(() => {
    if (displayedDiaryId && isInitialized) {
      localStorage.setItem(SELECTED_DIARY_KEY, displayedDiaryId)
    }
  }, [displayedDiaryId, isInitialized])

  const displayedDiary = diaries.find(d => d.id === displayedDiaryId)
  const shelfDiaries = diaries
    .filter(d => d.id !== displayedDiaryId)
    .sort((a, b) => a.volume_number - b.volume_number)

  const handleSpineClick = (diary: DiaryWithTemplates) => {
    setDisplayedDiaryId(diary.id)
    onSelectDiary?.(diary)
  }

  const handleCoverClick = () => {
    if (displayedDiary) {
      onSelectDiary?.(displayedDiary)
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
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-700">
            {displayedDiary?.title || '나의 일기장'}
          </h2>
          {displayedDiary && onEditDiary && (
            <button
              onClick={() => onEditDiary(displayedDiary)}
              className="text-gray-400 hover:text-pastel-purple transition-colors"
              title="이름 수정"
            >
              ✏️
            </button>
          )}
          {displayedDiary && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {displayedDiary.volume_number}권
            </span>
          )}
          {displayedDiaryId === activeDiaryId ? (
            <span className="text-xs text-white bg-emerald-500 px-2 py-0.5 rounded-full font-medium">
              사용 중
            </span>
          ) : displayedDiary && onActivateDiary && (
            <button
              onClick={() => onActivateDiary(displayedDiary)}
              className="text-xs text-pastel-purple hover:text-pastel-purple-dark bg-pastel-purple/10 hover:bg-pastel-purple/20 px-2 py-0.5 rounded-full transition-colors"
            >
              사용하기
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/bookshelf"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            📚 책장
          </Link>
          <Link
            href={`/customize${displayedDiaryId ? `?diary=${displayedDiaryId}` : ''}`}
            className="text-sm font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
          >
            꾸미기
          </Link>
        </div>
      </div>

      {/* Main content: Cover + Shelf */}
      <div className="flex items-start gap-6">
        {/* Cover display */}
        <div className="flex flex-col items-center gap-2">
          <AnimatePresence mode="wait">
            {displayedDiary && (
              <motion.div
                key={displayedDiary.id}
                layoutId={`diary-cover-main-${displayedDiary.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="group"
              >
                <Link href={`/diary?diary=${displayedDiary.id}`} onClick={handleCoverClick}>
                  <div className="relative transition-all duration-200 group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-xl">
                    <DiaryCover
                      template={displayedDiary.cover_template}
                      decorations={displayedDiary.cover_decorations}
                      coverImageUrl={displayedDiary.cover_image_url}
                      size="preview"
                    />
                  </div>
                  {/* Title below cover */}
                  <p className="mt-2 text-xs text-gray-600 font-medium text-center truncate max-w-[120px]">
                    {displayedDiary.title || `${displayedDiary.volume_number}권`}
                  </p>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mini bookshelf with other diaries */}
        {shelfDiaries.length > 0 && (
          <div className="flex-1 relative min-w-0">
            {/* Shelf */}
            <div className="relative pb-3">
              {/* Books - scrollable container */}
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent pb-2">
                <div className="flex items-end gap-1 min-h-[160px]">
                  {shelfDiaries.map((diary) => (
                    <MiniSpine
                      key={diary.id}
                      diary={diary}
                      isActive={diary.id === activeDiaryId}
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
