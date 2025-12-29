'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MegaphoneIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { PublicAnnouncement } from '@/app/api/announcements/route'

const typeStyles: Record<string, { bg: string; icon: string }> = {
  info: { bg: 'bg-blue-50 border-blue-200', icon: 'text-blue-500' },
  warning: { bg: 'bg-yellow-50 border-yellow-200', icon: 'text-yellow-500' },
  important: { bg: 'bg-red-50 border-red-200', icon: 'text-red-500' },
  event: { bg: 'bg-purple-50 border-purple-200', icon: 'text-purple-500' },
}

const DISMISSED_KEY = 'dismissed_announcement_cards'

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

export function AnnouncementCard() {
  const [announcement, setAnnouncement] = useState<PublicAnnouncement | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/announcements?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data.announcements?.length > 0) {
          const ann = data.announcements[0]
          const dismissed = getDismissedIds()
          if (!dismissed.includes(ann.id)) {
            setAnnouncement(ann)
          }
        }
      })
      .catch(console.error)
  }, [])

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (announcement) {
      addDismissedId(announcement.id)
      setIsDismissed(true)
    }
  }

  if (!announcement || isDismissed) return null

  const style = typeStyles[announcement.type] || typeStyles.info

  return (
    <div className="mb-6">
      <div className={`relative rounded-xl border ${style.bg} transition-all hover:shadow-md`}>
        <Link
          href={`/announcements?id=${announcement.id}`}
          className="block p-4 pr-12"
        >
          <div className="flex items-start gap-3">
            <MegaphoneIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.icon}`} />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{announcement.title}</h3>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </div>
        </Link>
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-white/50 active:bg-white/70"
          aria-label="닫기"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
