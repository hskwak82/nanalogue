'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MegaphoneIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { PublicAnnouncement } from '@/app/api/announcements/route'

const typeStyles: Record<string, { bg: string; icon: string }> = {
  info: { bg: 'bg-blue-50 border-blue-200', icon: 'text-blue-500' },
  warning: { bg: 'bg-yellow-50 border-yellow-200', icon: 'text-yellow-500' },
  important: { bg: 'bg-red-50 border-red-200', icon: 'text-red-500' },
  event: { bg: 'bg-purple-50 border-purple-200', icon: 'text-purple-500' },
}

export function AnnouncementCard() {
  const [announcement, setAnnouncement] = useState<PublicAnnouncement | null>(null)

  useEffect(() => {
    fetch('/api/announcements?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data.announcements?.length > 0) {
          setAnnouncement(data.announcements[0])
        }
      })
      .catch(console.error)
  }, [])

  if (!announcement) return null

  const style = typeStyles[announcement.type] || typeStyles.info

  return (
    <div className="max-w-2xl mx-auto px-4 pb-4">
      <Link
        href="/announcements"
        className={`block rounded-xl border ${style.bg} p-4 transition-all hover:shadow-md`}
      >
        <div className="flex items-start gap-3">
          <MegaphoneIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.icon}`} />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{announcement.title}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.content}</p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
        </div>
      </Link>
    </div>
  )
}
