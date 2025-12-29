'use client'

import { useEffect, useState } from 'react'
import { XMarkIcon, MegaphoneIcon } from '@heroicons/react/24/outline'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'important' | 'event'
  is_popup: boolean
  is_read: boolean
}

const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-500' },
  important: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500' },
  event: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500' },
}

const DISMISSED_STORAGE_KEY = 'nanalogue_dismissed_announcements'

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showPopup, setShowPopup] = useState<Announcement | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setDismissed(new Set(parsed))
        }
      }
    } catch (error) {
      console.error('Error loading dismissed announcements:', error)
    }
  }, [])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements')
        if (!response.ok) return
        const data = await response.json()
        setAnnouncements(data.announcements || [])

        // Show popup for unread popup announcements (not dismissed locally)
        const storedDismissed = localStorage.getItem(DISMISSED_STORAGE_KEY)
        const dismissedSet = storedDismissed ? new Set(JSON.parse(storedDismissed)) : new Set()

        const unreadPopup = data.announcements?.find(
          (a: Announcement) => a.is_popup && !a.is_read && !dismissedSet.has(a.id)
        )
        if (unreadPopup) {
          setShowPopup(unreadPopup)
        }
      } catch (error) {
        console.error('Error fetching announcements:', error)
      }
    }

    fetchAnnouncements()
  }, [])

  const markAsRead = async (announcementId: string) => {
    try {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId }),
      })
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleDismiss = (id: string) => {
    markAsRead(id)
    setDismissed((prev) => {
      const newSet = new Set([...prev, id])
      // Save to localStorage for persistence
      try {
        localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...newSet]))
      } catch (error) {
        console.error('Error saving dismissed announcements:', error)
      }
      return newSet
    })
  }

  const handleClosePopup = () => {
    if (showPopup) {
      markAsRead(showPopup.id)
      // Also save to localStorage for persistence
      setDismissed((prev) => {
        const newSet = new Set([...prev, showPopup.id])
        try {
          localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...newSet]))
        } catch (error) {
          console.error('Error saving dismissed announcements:', error)
        }
        return newSet
      })
      setShowPopup(null)
    }
  }

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    (a) => !dismissed.has(a.id) && !a.is_read
  )

  // Banner announcement (non-popup, unread)
  const bannerAnnouncements = visibleAnnouncements.filter((a) => !a.is_popup)
  const currentBanner = bannerAnnouncements[currentIndex % bannerAnnouncements.length]

  return (
    <>
      {/* Banner */}
      {currentBanner && (
        <div
          className={`${typeStyles[currentBanner.type]?.bg || 'bg-gray-50'} ${
            typeStyles[currentBanner.type]?.border || 'border-gray-200'
          } border-b px-4 py-2`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <MegaphoneIcon
                className={`h-5 w-5 shrink-0 ${
                  typeStyles[currentBanner.type]?.icon || 'text-gray-500'
                }`}
              />
              <div className="min-w-0">
                <span className="font-medium text-gray-900">{currentBanner.title}</span>
                <span className="text-gray-600 ml-2 hidden sm:inline">
                  {currentBanner.content.length > 100
                    ? currentBanner.content.slice(0, 100) + '...'
                    : currentBanner.content}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(currentBanner.id)}
              className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`${typeStyles[showPopup.type]?.bg || 'bg-white'} rounded-xl shadow-xl max-w-md w-full`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MegaphoneIcon
                    className={`h-6 w-6 ${
                      typeStyles[showPopup.type]?.icon || 'text-gray-500'
                    }`}
                  />
                  <h3 className="text-lg font-semibold text-gray-900">{showPopup.title}</h3>
                </div>
                <button
                  onClick={handleClosePopup}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{showPopup.content}</p>
              <button
                onClick={handleClosePopup}
                className="mt-6 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
