'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DiaryShelfViewer } from '@/components/bookshelf/DiaryShelfViewer'
import { EditDiaryModal } from '@/components/modals/EditDiaryModal'
import type { DiaryWithTemplates } from '@/types/diary'

interface DiaryShelfSectionProps {
  diaries: DiaryWithTemplates[]
}

export function DiaryShelfSection({
  diaries
}: DiaryShelfSectionProps) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDiary, setSelectedDiary] = useState<DiaryWithTemplates | null>(null)

  const handleEditDiary = (diary: DiaryWithTemplates) => {
    setSelectedDiary(diary)
    setShowEditModal(true)
  }

  const handleSaveTitle = async (title: string) => {
    if (!selectedDiary) return

    const response = await fetch(`/api/diaries/${selectedDiary.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })

    if (!response.ok) {
      throw new Error('Failed to update diary')
    }

    // Refresh the page to get updated data
    router.refresh()
  }

  return (
    <>
      <DiaryShelfViewer
        diaries={diaries}
        onEditDiary={handleEditDiary}
      />

      <EditDiaryModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={handleSaveTitle}
        diary={selectedDiary}
      />
    </>
  )
}
