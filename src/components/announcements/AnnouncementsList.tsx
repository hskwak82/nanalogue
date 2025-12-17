'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { PublicAnnouncement } from '@/app/api/announcements/route'

const typeLabels: Record<string, { label: string; cls: string }> = {
  info: { label: '정보', cls: 'bg-blue-100 text-blue-700' },
  warning: { label: '주의', cls: 'bg-yellow-100 text-yellow-700' },
  important: { label: '중요', cls: 'bg-red-100 text-red-700' },
  event: { label: '이벤트', cls: 'bg-purple-100 text-purple-700' },
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const ITEMS_PER_PAGE = 10

export function AnnouncementsList() {
  const searchParams = useSearchParams()
  const initialId = searchParams.get('id')

  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(initialId)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/announcements?page=${currentPage}&limit=${ITEMS_PER_PAGE}`)
      .then(res => res.json())
      .then(data => {
        setAnnouncements(data.announcements || [])
        setPagination(data.pagination || null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [currentPage])

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pastel-purple"></div>
      </div>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        등록된 공지사항이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.map((announcement) => {
          const typeStyle = getTypeStyle(announcement.type)
          const isSelected = selectedId === announcement.id
          return (
            <div
              key={announcement.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setSelectedId(isSelected ? null : announcement.id)}
                className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${typeStyle.cls}`}>
                        {typeStyle.label}
                      </span>
                      <h3 className="font-medium text-gray-900 truncate">{announcement.title}</h3>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatDate(announcement.starts_at)}
                  </span>
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${isSelected ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isSelected && (
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
              // Show first, last, current, and neighbors
              const showPage =
                page === 1 ||
                page === pagination.totalPages ||
                Math.abs(page - currentPage) <= 1

              if (!showPage) {
                // Show ellipsis only once between gaps
                if (page === 2 && currentPage > 3) {
                  return <span key={page} className="px-2 text-gray-400">...</span>
                }
                if (page === pagination.totalPages - 1 && currentPage < pagination.totalPages - 2) {
                  return <span key={page} className="px-2 text-gray-400">...</span>
                }
                return null
              }

              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-pastel-purple text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.totalPages}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Total count */}
      {pagination && (
        <p className="text-center text-sm text-gray-500">
          전체 {pagination.total}개
        </p>
      )}
    </div>
  )
}
