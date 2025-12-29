'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon, MegaphoneIcon } from '@heroicons/react/24/outline'
import type { PublicAnnouncement } from '@/app/api/announcements/route'

const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-500' },
  important: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500' },
  event: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500' },
}

const DISMISSED_KEY = 'dismissed_announcements'

function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(DISMISSED_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addDismissedId(id: string) {
  const dismissed = getDismissedIds()
  if (!dismissed.includes(id)) {
    dismissed.push(id)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))
  }
}

export function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    fetch('/api/announcements?popup=true&limit=5')
      .then(res => res.json())
      .then(data => {
        if (data.announcements?.length > 0) {
          const dismissed = getDismissedIds()
          const filtered = data.announcements.filter(
            (a: PublicAnnouncement) => !dismissed.includes(a.id)
          )
          setAnnouncements(filtered)
        }
      })
      .catch(console.error)
  }, [])

  const currentAnnouncement = announcements[currentIndex]

  if (!currentAnnouncement) return null

  const style = typeStyles[currentAnnouncement.type] || typeStyles.info

  const handleClose = (dismiss: boolean = false) => {
    // Always dismiss when X is clicked, or when checkbox is checked
    if (dismiss || dontShowAgain) {
      addDismissedId(currentAnnouncement.id)
    }

    if (currentIndex < announcements.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setDontShowAgain(false)
    } else {
      setAnnouncements([])
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in`}>
        {/* Header */}
        <div className={`${style.bg} ${style.border} border-b px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <MegaphoneIcon className={`h-5 w-5 ${style.icon}`} />
            <span className="text-sm font-medium text-gray-700">공지사항</span>
            {announcements.length > 1 && (
              <span className="text-xs text-gray-500">
                ({currentIndex + 1}/{announcements.length})
              </span>
            )}
          </div>
          <button
            onClick={() => handleClose(true)}
            className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-white/50 active:bg-white/70"
            aria-label="닫기"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {currentAnnouncement.title}
          </h2>
          <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
            {currentAnnouncement.content}
          </p>
          <p className="text-xs text-gray-400 mt-4">
            {formatDate(currentAnnouncement.starts_at)}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600">다시 보지 않기</span>
          </label>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
