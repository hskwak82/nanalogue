'use client'

import { useEffect, useState } from 'react'
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui'

interface CoverTemplate {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  image_url: string
  category: string
  is_free: boolean
  sort_order: number
  is_active: boolean
}

interface PaperTemplate {
  id: string
  name: string
  thumbnail_url: string | null
  background_color: string
  background_image_url: string | null
  line_style: string
  line_color: string
  is_free: boolean
  sort_order: number
  is_active: boolean
}

type TemplateType = 'cover' | 'paper'

function CoverTemplatePreview({ template }: { template: CoverTemplate }) {
  const imageUrl = template.thumbnail_url || template.image_url

  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        No Image
      </div>
    )
  }

  // Handle gradient: prefix
  if (imageUrl.startsWith('gradient:')) {
    const gradient = imageUrl.replace('gradient:', '')
    return (
      <div
        className="w-full h-full"
        style={{ background: gradient }}
      />
    )
  }

  // Handle solid: prefix
  if (imageUrl.startsWith('solid:')) {
    const color = imageUrl.replace('solid:', '')
    return (
      <div
        className="w-full h-full"
        style={{ backgroundColor: color }}
      />
    )
  }

  // Regular image URL
  return (
    <img
      src={imageUrl}
      alt={template.name}
      className="w-full h-full object-cover"
    />
  )
}

function PaperTemplatePreview({ template }: { template: PaperTemplate }) {
  const renderLines = () => {
    const lineColor = template.line_color || '#E5E5E5'

    switch (template.line_style) {
      case 'lined':
        return (
          <div className="absolute inset-0 flex flex-col justify-start pt-4 px-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-px mb-3"
                style={{ backgroundColor: lineColor }}
              />
            ))}
          </div>
        )
      case 'grid':
        return (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(${lineColor} 1px, transparent 1px),
                linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />
        )
      case 'dotted':
        return (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, ${lineColor} 1px, transparent 1px)`,
              backgroundSize: '15px 15px',
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div
      className="w-full h-full relative"
      style={{
        backgroundColor: template.background_color,
        backgroundImage: template.background_image_url
          ? `url(${template.background_image_url})`
          : undefined,
        backgroundSize: 'cover',
      }}
    >
      {renderLines()}
      {template.line_style !== 'none' && (
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/30 rounded text-[10px] text-white">
          {template.line_style === 'lined' && '줄노트'}
          {template.line_style === 'grid' && '모눈'}
          {template.line_style === 'dotted' && '점선'}
        </div>
      )}
    </div>
  )
}

export default function AdminTemplatesPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TemplateType>('cover')
  const [coverTemplates, setCoverTemplates] = useState<CoverTemplate[]>([])
  const [paperTemplates, setPaperTemplates] = useState<PaperTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchTemplates = async (type: TemplateType) => {
    try {
      const response = await fetch(`/api/admin/templates?type=${type}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      if (type === 'cover') {
        setCoverTemplates(data.templates)
      } else {
        setPaperTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTemplates('cover'), fetchTemplates('paper')]).finally(() =>
      setLoading(false)
    )
  }, [])

  const togglePremium = async (id: string, type: TemplateType, currentIsFree: boolean) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, is_free: !currentIsFree }),
      })
      if (!response.ok) throw new Error('Failed to update')
      await fetchTemplates(type)
    } catch (error) {
      toast.error('업데이트 실패')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, type: TemplateType, currentIsActive: boolean) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, is_active: !currentIsActive }),
      })
      if (!response.ok) throw new Error('Failed to update')
      await fetchTemplates(type)
    } catch (error) {
      toast.error('업데이트 실패')
    } finally {
      setSaving(false)
    }
  }

  const updateSortOrder = async (id: string, type: TemplateType, sortOrder: number) => {
    try {
      await fetch('/api/admin/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, sort_order: sortOrder }),
      })
      await fetchTemplates(type)
    } catch (error) {
      console.error('Error updating sort order:', error)
    }
  }

  const templates = activeTab === 'cover' ? coverTemplates : paperTemplates

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('cover')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'cover'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          표지 템플릿 ({coverTemplates.length})
        </button>
        <button
          onClick={() => setActiveTab('paper')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'paper'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          속지 템플릿 ({paperTemplates.length})
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`rounded-xl bg-white p-4 shadow-sm border ${
              !template.is_active ? 'opacity-50 border-gray-200' : 'border-gray-100'
            }`}
          >
            {/* Thumbnail */}
            <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-3 overflow-hidden">
              {activeTab === 'cover' ? (
                <CoverTemplatePreview template={template as CoverTemplate} />
              ) : (
                <PaperTemplatePreview template={template as PaperTemplate} />
              )}
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
                <div className="flex gap-1">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      template.is_free
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {template.is_free ? '무료' : '프리미엄'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => togglePremium(template.id, activeTab, template.is_free)}
                  disabled={saving}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  {template.is_free ? '프리미엄으로' : '무료로'}
                </button>
                <button
                  onClick={() => toggleActive(template.id, activeTab, template.is_active)}
                  disabled={saving}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                    template.is_active
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  } disabled:opacity-50`}
                >
                  {template.is_active ? '비활성화' : '활성화'}
                </button>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>순서:</span>
                <input
                  type="number"
                  value={template.sort_order}
                  onChange={(e) =>
                    updateSortOrder(template.id, activeTab, parseInt(e.target.value) || 0)
                  }
                  className="w-16 px-2 py-1 border border-gray-200 rounded text-center"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-gray-500">템플릿이 없습니다.</div>
      )}

      {/* Info */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">참고</p>
        <ul className="list-disc list-inside space-y-1">
          <li>프리미엄 템플릿은 프로 플랜 사용자만 사용할 수 있습니다.</li>
          <li>비활성화된 템플릿은 사용자에게 표시되지 않습니다.</li>
          <li>순서 값이 낮을수록 먼저 표시됩니다.</li>
        </ul>
      </div>
    </div>
  )
}
