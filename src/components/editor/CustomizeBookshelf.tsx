'use client'

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
  // Directly use parent's selectedDiaryId - no local state needed
  const handleSelectDiary = (diary: DiaryWithTemplates) => {
    onSelectDiary(diary)
  }

  const handleCoverClick = (diary: DiaryWithTemplates) => {
    onCustomize?.(diary)
  }

  if (diaries.length === 0) {
    return null
  }

  return (
    <UnifiedBookshelf
      diaries={diaries}
      selectedDiaryId={selectedDiaryId}
      activeDiaryId={activeDiaryId}
      onSelectDiary={handleSelectDiary}
      onCoverClick={handleCoverClick}
      layoutId="customize"
    />
  )
}
