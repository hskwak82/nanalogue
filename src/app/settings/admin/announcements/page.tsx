'use client'

import { useEffect, useState } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useToast, useConfirm } from '@/components/ui'
import type { Announcement } from '@/app/api/admin/announcements/route'

const typeLabels: Record<string, { label: string; class: string }> = {
  info: { label: '정보', class: 'bg-blue-100 text-blue-700' },
  warning: { label: '주의', class: 'bg-yellow-100 text-yellow-700' },
  important: { label: '중요', class: 'bg-red-100 text-red-700' },
  event: { label: '이벤트', class: 'bg-purple-100 text-purple-700' },
}

const audienceLabels: Record<string, string> = {
  all: '전체',
  free: '무료 사용자',
  pro: '프로 사용자',
}

interface FormData {
  title: string
  content: string
  type: string
  is_popup: boolean
  starts_at: string
  ends_at: string
  target_audience: string
}

const defaultFormData: FormData = {
  title: '',
  content: '',
  type: 'info',
  is_popup: false,
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: '',
  target_audience: 'all',
}

export default function AdminAnnouncementsPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [saving, setSaving] = useState(false)

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/admin/announcements')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setAnnouncements(data.announcements)
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...formData,
        ends_at: formData.ends_at || null,
      }

      const response = await fetch('/api/admin/announcements', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      })

      if (!response.ok) throw new Error('Failed to save')

      await fetchAnnouncements()
      setShowForm(false)
      setEditingId(null)
      setFormData(defaultFormData)
    } catch (error) {
      toast.error('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      is_popup: announcement.is_popup,
      starts_at: announcement.starts_at.slice(0, 16),
      ends_at: announcement.ends_at?.slice(0, 16) || '',
      target_audience: announcement.target_audience,
    })
    setEditingId(announcement.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '삭제 확인',
      message: '정말 삭제하시겠습니까?',
      confirmText: '삭제',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')
      await fetchAnnouncements()
    } catch (error) {
      toast.error('삭제 실패')
    }
  }

  const toggleActive = async (id: string, currentIsActive: boolean) => {
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentIsActive }),
      })
      if (!response.ok) throw new Error('Failed to update')
      await fetchAnnouncements()
    } catch (error) {
      toast.error('업데이트 실패')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          공지사항 ({announcements.length})
        </h2>
        <button
          onClick={() => {
            setFormData(defaultFormData)
            setEditingId(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" />
          새 공지
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">
                {editingId ? '공지사항 수정' : '새 공지사항'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="info">정보</option>
                    <option value="warning">주의</option>
                    <option value="important">중요</option>
                    <option value="event">이벤트</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">대상</label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">전체</option>
                    <option value="free">무료 사용자</option>
                    <option value="pro">프로 사용자</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                  <input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일 (선택)</label>
                  <input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_popup}
                  onChange={(e) => setFormData({ ...formData, is_popup: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">팝업으로 표시</span>
              </label>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={`rounded-xl bg-white p-5 shadow-sm border ${
              !announcement.is_active ? 'opacity-50 border-gray-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      typeLabels[announcement.type]?.class || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {typeLabels[announcement.type]?.label || announcement.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {audienceLabels[announcement.target_audience]}
                  </span>
                  {announcement.is_popup && (
                    <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                      팝업
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {formatDate(announcement.starts_at)}
                  {announcement.ends_at && ` ~ ${formatDate(announcement.ends_at)}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(announcement.id, announcement.is_active)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                    announcement.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {announcement.is_active ? '활성' : '비활성'}
                </button>
                <button
                  onClick={() => handleEdit(announcement)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            등록된 공지사항이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
