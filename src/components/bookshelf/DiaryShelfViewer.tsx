'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { DiaryWithTemplates } from '@/types/diary'
import { UnifiedBookshelf } from './UnifiedBookshelf'

const SELECTED_DIARY_KEY = 'nanalogue_selected_diary'

interface DiaryShelfViewerProps {
  diaries: DiaryWithTemplates[]
  onSelectDiary?: (diary: DiaryWithTemplates) => void
  onEditDiary?: (diary: DiaryWithTemplates) => void
}

export function DiaryShelfViewer({
  diaries,
  onSelectDiary,
  onEditDiary
}: DiaryShelfViewerProps) {
  const router = useRouter()
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize from localStorage or first diary
  useEffect(() => {
    if (isInitialized || diaries.length === 0) return

    const savedId = localStorage.getItem(SELECTED_DIARY_KEY)
    const savedDiaryExists = savedId && diaries.some(d => d.id === savedId)

    if (savedDiaryExists) {
      setSelectedDiaryId(savedId)
    } else {
      const sortedDiaries = [...diaries].sort((a, b) => b.volume_number - a.volume_number)
      setSelectedDiaryId(sortedDiaries[0].id)
    }

    setIsInitialized(true)
  }, [diaries, isInitialized])

  // Save to localStorage when selection changes
  useEffect(() => {
    if (selectedDiaryId && isInitialized) {
      localStorage.setItem(SELECTED_DIARY_KEY, selectedDiaryId)
    }
  }, [selectedDiaryId, isInitialized])

  const handleSelectDiary = (diary: DiaryWithTemplates) => {
    setSelectedDiaryId(diary.id)
    onSelectDiary?.(diary)
  }

  const handleCoverClick = (diary: DiaryWithTemplates) => {
    router.push(`/diary?diary=${diary.id}`)
  }

  return (
    <UnifiedBookshelf
      diaries={diaries}
      selectedDiaryId={selectedDiaryId}
      onSelectDiary={handleSelectDiary}
      onCoverClick={handleCoverClick}
      showCustomizeLink
      showBookshelfLink
      showEditButton={!!onEditDiary}
      onEditDiary={onEditDiary}
      layoutId="dashboard"
    />
  )
}
