'use client'

import { useState, useEffect } from 'react'
import type { DiaryWithTemplates } from '@/types/diary'
import { UnifiedBookshelf } from '@/components/bookshelf/UnifiedBookshelf'

interface CustomizeBookshelfProps {
  diaries: DiaryWithTemplates[]
  activeDiaryId?: string | null
  selectedDiaryId: string | null
  onSelectDiary: (diary: DiaryWithTemplates) => void
  onCustomize?: (diary: DiaryWithTemplates) => void
}

export function CustomizeBookshelf({
  diaries,
  activeDiaryId,
  selectedDiaryId,
  onSelectDiary,
  onCustomize
}: CustomizeBookshelfProps) {
  const [displayedDiaryId, setDisplayedDiaryId] = useState<string | null>(selectedDiaryId)

  // Sync with selected diary from parent
  useEffect(() => {
    if (selectedDiaryId) {
      setDisplayedDiaryId(selectedDiaryId)
    }
  }, [selectedDiaryId])

  const handleSelectDiary = (diary: DiaryWithTemplates) => {
    setDisplayedDiaryId(diary.id)
  }

  const handleCoverClick = (diary: DiaryWithTemplates) => {
    onSelectDiary(diary)
    onCustomize?.(diary)
  }

  if (diaries.length === 0) {
    return null
  }

  return (
    <UnifiedBookshelf
      diaries={diaries}
      selectedDiaryId={displayedDiaryId}
      activeDiaryId={activeDiaryId}
      onSelectDiary={handleSelectDiary}
      onCoverClick={handleCoverClick}
      layoutId="customize"
    />
  )
}
