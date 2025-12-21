'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Bookshelf } from '@/components/bookshelf/Bookshelf'
import { NewDiaryModal } from '@/components/modals/NewDiaryModal'
import { EditDiaryModal } from '@/components/modals/EditDiaryModal'
import type { DiaryWithTemplates, DiaryListResponse } from '@/types/diary'

export default function BookshelfPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [diaries, setDiaries] = useState<DiaryWithTemplates[]>([])
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null)

  // Modal states
  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDiary, setSelectedDiary] = useState<DiaryWithTemplates | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Load diaries
  const loadDiaries = useCallback(async () => {
    try {
      const response = await fetch('/api/diaries')
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch')
      }

      const data: DiaryListResponse = await response.json()
      setDiaries(data.diaries)
    } catch (error) {
      console.error('Error loading diaries:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Load user info and admin status
  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/customization/load')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('Error loading user:', error)
      }
    }

    async function checkAdminStatus() {
      try {
        const response = await fetch('/api/user/admin-status')
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      }
    }

    loadUser()
    checkAdminStatus()
    loadDiaries()
  }, [loadDiaries])

  // Handle diary selection
  const handleSelectDiary = (diary: DiaryWithTemplates) => {
    setSelectedDiary(diary)
    // Navigate to diary detail or open in customize mode
    router.push(`/diary?volume=${diary.volume_number}`)
  }

  // Handle create new diary
  const handleCreateNew = async (title: string, inheritFromPrevious: boolean) => {
    const response = await fetch('/api/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        inherit_from_previous: inheritFromPrevious,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create diary')
    }

    await loadDiaries()
  }

  // Handle edit diary title
  const handleEditTitle = async (title: string) => {
    if (!selectedDiary) return

    const response = await fetch(`/api/diaries/${selectedDiary.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })

    if (!response.ok) {
      throw new Error('Failed to update diary')
    }

    await loadDiaries()
  }

  // Calculate next volume number
  const nextVolumeNumber = diaries.length > 0
    ? Math.max(...diaries.map(d => d.volume_number)) + 1
    : 1

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pastel-cream flex items-center justify-center">
        <div className="text-pastel-purple">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pastel-cream">
      <Navigation user={user ? { email: user.email, name: user.name || undefined } : null} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-700">나의 책장</h1>
        </div>

        {/* Bookshelf */}
        <Bookshelf
          diaries={diaries}
          onSelectDiary={handleSelectDiary}
          onCreateNew={() => setShowNewModal(true)}
          onEdit={(diary) => {
            setSelectedDiary(diary)
            setShowEditModal(true)
          }}
          isAdmin={isAdmin}
        />
      </main>

      {/* Modals */}
      <NewDiaryModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onConfirm={handleCreateNew}
        nextVolumeNumber={nextVolumeNumber}
      />

      <EditDiaryModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onConfirm={handleEditTitle}
        diary={selectedDiary}
      />
    </div>
  )
}
