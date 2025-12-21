'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import type { DiaryWithTemplates, BookshelfViewMode } from '@/types/diary'
import { formatDateRange } from '@/types/diary'
import { DiaryCover } from '@/components/diary/DiaryCover'
import { getSpinePreset, getSpineBackgroundStyle, getSpineBandStyles } from '@/lib/spine-renderer'
import { BOOKSHELF_SPINE_WIDTH_RATIO, PRINT_SPECS } from '@/lib/publishing/print-constants'

// Spine dimensions for bookshelf display
const BOOKSHELF_SPINE_HEIGHT = 140
const BOOKSHELF_SPINE_WIDTH = Math.round(BOOKSHELF_SPINE_HEIGHT * PRINT_SPECS.PRINT_ASPECT_RATIO * BOOKSHELF_SPINE_WIDTH_RATIO)

interface DiaryEntry {
  id: string
  entry_date: string
  summary: string | null
  emotions: string[] | null
  diary_id: string
}

interface DiaryListClientProps {
  diaries: DiaryWithTemplates[]
  entries: DiaryEntry[]
  initialDiaryId?: string | null
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
            layoutId="diaryViewToggle"
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
            layoutId="diaryViewToggle"
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
  onClick
}: {
  diary: DiaryWithTemplates
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <motion.div
      layoutId={`diary-list-cover-${diary.id}`}
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
      layoutId={`diary-list-spine-${diary.id}`}
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

export function DiaryListClient({
  diaries,
  entries,
  initialDiaryId
}: DiaryListClientProps) {
  const [viewMode, setViewMode] = useState<BookshelfViewMode>('covers')

  // Find diary containing current date
  const findDiaryForCurrentDate = () => {
    const today = new Date().toISOString().split('T')[0]

    // First, check if there's an entry for today
    const todayEntry = entries.find(e => e.entry_date === today)
    if (todayEntry) {
      return todayEntry.diary_id
    }

    // Otherwise, find active diary or diary whose date range contains today
    const activeDiary = diaries.find(d => d.status === 'active')
    if (activeDiary) {
      return activeDiary.id
    }

    // Find diary whose date range contains today
    for (const diary of diaries) {
      const startDate = diary.start_date
      const endDate = diary.end_date || today
      if (startDate <= today && today <= endDate) {
        return diary.id
      }
    }

    // Fallback to first diary
    return diaries[0]?.id || null
  }

  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(
    initialDiaryId || findDiaryForCurrentDate()
  )

  // Get selected diary info
  const selectedDiary = diaries.find(d => d.id === selectedDiaryId)
  const activeDiaryId = diaries.find(d => d.status === 'active')?.id

  // Filter entries by selected diary
  const filteredEntries = useMemo(() => {
    if (!selectedDiaryId) return entries
    return entries.filter(e => e.diary_id === selectedDiaryId)
  }, [entries, selectedDiaryId])

  // Group filtered entries by month
  const entriesByMonth = useMemo(() => {
    const grouped: Record<string, DiaryEntry[]> = {}
    filteredEntries.forEach((entry) => {
      const monthKey = entry.entry_date.substring(0, 7) // YYYY-MM
      if (!grouped[monthKey]) {
        grouped[monthKey] = []
      }
      grouped[monthKey].push(entry)
    })
    return grouped
  }, [filteredEntries])

  // Sort diaries by volume number
  const sortedDiaries = [...diaries].sort((a, b) => a.volume_number - b.volume_number)

  if (diaries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">아직 일기장이 없습니다.</p>
        <Link
          href="/session?entry=true"
          className="inline-flex items-center justify-center rounded-full bg-pastel-purple px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pastel-purple-dark transition-all"
        >
          첫 일기 작성하기
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Bookshelf Card */}
      <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-4 sm:p-6 shadow-sm border border-pastel-pink/30 overflow-visible">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <h2 className="text-base sm:text-lg font-semibold text-gray-700">책장</h2>
            <span className="text-sm text-gray-400">{diaries.length}권</span>
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
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
                {/* Horizontal scrollable cover grid */}
                <div className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-pastel-purple/30 scrollbar-track-transparent -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="flex items-start gap-4 min-h-[220px] pt-4 pb-6">
                    {sortedDiaries.map((diary) => (
                      <CoverCard
                        key={diary.id}
                        diary={diary}
                        isSelected={diary.id === selectedDiaryId}
                        onClick={() => setSelectedDiaryId(diary.id)}
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
                {/* Spine shelf */}
                <div className="relative pb-3">
                  <div className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent pb-2 pt-4 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="flex items-end gap-1 min-h-[160px]" style={{ perspective: '800px' }}>
                      {sortedDiaries.map((diary) => (
                        <MiniSpine
                          key={diary.id}
                          diary={diary}
                          isActive={diary.id === activeDiaryId}
                          isSelected={diary.id === selectedDiaryId}
                          onClick={() => setSelectedDiaryId(diary.id)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Shelf surface */}
                  <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-b from-amber-100/60 to-amber-200/70 rounded-b shadow-inner" />
                  <div className="absolute -bottom-1 left-1 right-1 h-1 bg-amber-900/10 rounded-full blur-sm" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>

        {/* Selected diary info */}
        {selectedDiary && (
          <div className="mt-4 pt-3 border-t border-pastel-pink/30 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              <span className="font-medium">{selectedDiary.title || `${selectedDiary.volume_number}권`}</span>
              <span className="text-gray-400 ml-2">{filteredEntries.length}개 기록</span>
            </span>
            <Link
              href={`/customize?diary=${selectedDiary.id}`}
              className="text-xs font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
            >
              꾸미기
            </Link>
          </div>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(entriesByMonth).map(([monthKey, monthEntries]) => (
            <div key={monthKey}>
              <h2 className="mb-4 text-lg font-semibold text-pastel-purple-dark">
                {new Date(monthKey + '-01').toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                })}
              </h2>
              <div className="space-y-3">
                {monthEntries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/diary/${entry.entry_date}`}
                    className="block rounded-2xl bg-white/70 backdrop-blur-sm p-5 shadow-sm border border-pastel-pink/30 hover:shadow-md hover:bg-white/80 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">
                          {new Date(entry.entry_date).toLocaleDateString(
                            'ko-KR',
                            {
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long',
                            }
                          )}
                        </p>
                        {entry.summary && (
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                            {entry.summary}
                          </p>
                        )}
                        {entry.emotions &&
                          Array.isArray(entry.emotions) &&
                          entry.emotions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {entry.emotions.slice(0, 3).map(
                                (emotion, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded-full bg-pastel-purple-light px-2 py-0.5 text-xs text-pastel-purple-dark"
                                  >
                                    {emotion}
                                  </span>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {selectedDiary
              ? `${selectedDiary.title || `${selectedDiary.volume_number}권`}에 작성된 일기가 없습니다.`
              : '아직 작성된 일기가 없습니다.'}
          </p>
          <Link
            href="/session?entry=true"
            className="inline-flex items-center justify-center rounded-full bg-pastel-purple px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pastel-purple-dark transition-all"
          >
            일기 작성하기
          </Link>
        </div>
      )}
    </div>
  )
}
