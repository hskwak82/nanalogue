'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui'

interface DecorationItem {
  id: string
  name: string
  item_type: 'emoji' | 'icon' | 'sticker'
  content: string
  category: string
  is_free: boolean
  sort_order: number
  is_active: boolean
}

export default function AdminDecorationsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<DecorationItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      if (showInactive) params.set('includeInactive', 'true')

      const response = await fetch(`/api/admin/decorations?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setItems(data.items)
      setCategories(data.categories)
    } catch (error) {
      console.error('Error fetching decorations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchItems()
  }, [selectedCategory, showInactive])

  const togglePremium = async (id: string, currentIsFree: boolean) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/decorations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_free: !currentIsFree }),
      })
      if (!response.ok) throw new Error('Failed to update')
      await fetchItems()
    } catch (error) {
      toast.error('업데이트 실패')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, currentIsActive: boolean) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/decorations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentIsActive }),
      })
      if (!response.ok) throw new Error('Failed to update')
      await fetchItems()
    } catch (error) {
      toast.error('업데이트 실패')
    } finally {
      setSaving(false)
    }
  }

  const bulkTogglePremium = async (isFree: boolean) => {
    if (selectedIds.size === 0) {
      toast.warning('항목을 선택해주세요.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/decorations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), is_free: isFree }),
      })
      if (!response.ok) throw new Error('Failed to update')
      await fetchItems()
      setSelectedIds(new Set())
    } catch (error) {
      toast.error('업데이트 실패')
    } finally {
      setSaving(false)
    }
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }

  // Render decoration content (SVG or emoji)
  const renderContent = (content: string) => {
    if (content.trim().startsWith('<svg')) {
      return (
        <div
          className="w-8 h-8 mx-auto [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )
    }
    return <span>{content}</span>
  }

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, DecorationItem[]>
  )

  const stats = {
    total: items.length,
    free: items.filter((i) => i.is_free).length,
    premium: items.filter((i) => !i.is_free).length,
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
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">전체</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-600">{stats.free}</p>
          <p className="text-xs text-gray-500">무료</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-indigo-600">{stats.premium}</p>
          <p className="text-xs text-gray-500">프리미엄</p>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">모든 카테고리</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          비활성 포함
        </label>

        <div className="flex-1" />

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{selectedIds.size}개 선택됨</span>
            <button
              onClick={() => bulkTogglePremium(true)}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              무료로
            </button>
            <button
              onClick={() => bulkTogglePremium(false)}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
            >
              프리미엄으로
            </button>
          </div>
        )}
      </div>

      {/* Items by Category */}
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {category} ({categoryItems.length})
            </h3>
            <button
              onClick={selectAll}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              {selectedIds.size === items.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {categoryItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleSelection(item.id)}
                className={`relative p-2 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedIds.has(item.id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-transparent hover:border-gray-200'
                } ${!item.is_active ? 'opacity-40' : ''}`}
              >
                {/* Content */}
                <div className="text-3xl text-center mb-1">{renderContent(item.content)}</div>

                {/* Premium Badge */}
                {!item.is_free && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">P</span>
                  </div>
                )}

                {/* Name */}
                <p className="text-[10px] text-gray-500 text-center truncate">{item.name}</p>

                {/* Quick Actions on Hover */}
                <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePremium(item.id, item.is_free)
                    }}
                    className="px-2 py-1 text-[10px] bg-white rounded text-gray-700"
                  >
                    {item.is_free ? 'P' : 'F'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleActive(item.id, item.is_active)
                    }}
                    className="px-2 py-1 text-[10px] bg-white rounded text-gray-700"
                  >
                    {item.is_active ? '끄기' : '켜기'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">데코레이션 아이템이 없습니다.</div>
      )}

      {/* Info */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">사용법</p>
        <ul className="list-disc list-inside space-y-1">
          <li>클릭하여 선택 후 상단 버튼으로 일괄 변경</li>
          <li>호버 시 개별 아이템 빠른 설정 가능</li>
          <li>P = 프리미엄, F = 무료</li>
        </ul>
      </div>
    </div>
  )
}
