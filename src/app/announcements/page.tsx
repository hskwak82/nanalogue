'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon, MegaphoneIcon } from '@heroicons/react/24/outline'
import type { PublicAnnouncement } from '@/app/api/announcements/route'

const typeLabels: Record<string, { label: string; cls: string }> = {
  info: { label: '정보', cls: 'bg-blue-100 text-blue-700' },
  warning: { label: '주의', cls: 'bg-yellow-100 text-yellow-700' },
  important: { label: '중요', cls: 'bg-red-100 text-red-700' },
  event: { label: '이벤트', cls: 'bg-purple-100 text-purple-700' },
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/announcements?limit=50')
      .then(res => res.json())
      .then(data => {
        setAnnouncements(data.announcements || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getTypeStyle = (type: string) => {
    return typeLabels[type] || { label: type, cls: 'bg-gray-100 text-gray-700' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/30 to-pastel-cream">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/home" className="p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <MegaphoneIcon className="h-5 w-5 text-indigo-500" />
            <h1 className="text-lg font-semibold text-gray-900">공지사항</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => {
              const typeStyle = getTypeStyle(announcement.type)
              return (
                <div
                  key={announcement.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedId(selectedId === announcement.id ? null : announcement.id)}
                    className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${typeStyle.cls}`}>
                            {typeStyle.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(announcement.starts_at)}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                      </div>
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${selectedId === announcement.id ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  
                  {selectedId === announcement.id && (
                    <div className="px-5 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
                      <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {announcement.content}
                      </p>
                      {announcement.ends_at && (
                        <p className="text-xs text-gray-400 mt-3">
                          ~ {formatDate(announcement.ends_at)}까지
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
