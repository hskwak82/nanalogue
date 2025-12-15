'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { CoverEditor } from '@/components/editor/CoverEditor'
import { ItemPalette } from '@/components/editor/ItemPalette'
import {
  CoverTemplateSelector,
  PaperTemplateSelector,
} from '@/components/editor/TemplateSelector'
import { useEditorState } from '@/lib/editor/useEditorState'
import type {
  CoverTemplate,
  PaperTemplate,
  DecorationItem,
  CustomizationLoadResponse,
} from '@/types/customization'

type TabType = 'cover' | 'paper'

function CustomizePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const diaryIdParam = searchParams.get('diary')

  const [activeTab, setActiveTab] = useState<TabType>('cover')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data from API
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null)
  const [coverTemplates, setCoverTemplates] = useState<CoverTemplate[]>([])
  const [paperTemplates, setPaperTemplates] = useState<PaperTemplate[]>([])
  const [decorationItems, setDecorationItems] = useState<DecorationItem[]>([])
  const [diaryId, setDiaryId] = useState<string | null>(null)

  // Editor state
  const {
    state,
    setCover,
    setPaper,
    addDecoration,
    updateDecoration,
    removeDecoration,
    selectItem,
    loadState,
    markSaved,
  } = useEditorState()

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const url = diaryIdParam
          ? `/api/customization/load?diaryId=${diaryIdParam}`
          : '/api/customization/load'
        const response = await fetch(url)
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to load customization data')
        }

        const data: CustomizationLoadResponse & { diaryId?: string } = await response.json()

        setUser(data.user)
        setCoverTemplates(data.coverTemplates)
        setPaperTemplates(data.paperTemplates)
        setDecorationItems(data.decorationItems)
        if (data.diaryId) {
          setDiaryId(data.diaryId)
        }

        // Load existing customization
        if (data.customization) {
          const cover = data.coverTemplates.find(
            (t) => t.id === data.customization?.cover_template_id
          ) || null
          const paper = data.paperTemplates.find(
            (t) => t.id === data.customization?.paper_template_id
          ) || null

          loadState(cover, paper, data.customization.cover_decorations)
        } else if (data.coverTemplates.length > 0) {
          // Set default cover
          setCover(data.coverTemplates[0])
        }
      } catch (err) {
        console.error('Error loading customization:', err)
        setError('데이터를 불러오는 데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, loadState, setCover, diaryIdParam])

  // Save customization
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/customization/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diary_id: diaryId,
          cover_template_id: state.selectedCover?.id || null,
          paper_template_id: state.selectedPaper?.id || null,
          cover_decorations: state.decorations,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      markSaved()
      alert('저장되었습니다!')
    } catch (err) {
      console.error('Error saving:', err)
      setError('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-700">일기장 꾸미기</h1>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !state.isDirty}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              state.isDirty
                ? 'bg-pastel-purple text-white hover:bg-pastel-purple-dark'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('cover')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'cover'
                ? 'bg-pastel-purple text-white'
                : 'bg-white/70 text-gray-600 hover:bg-white'
            }`}
          >
            표지 꾸미기
          </button>
          <button
            onClick={() => setActiveTab('paper')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'paper'
                ? 'bg-pastel-purple text-white'
                : 'bg-white/70 text-gray-600 hover:bg-white'
            }`}
          >
            속지 선택
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeTab === 'cover' ? (
            <>
              {/* Left: Cover Editor */}
              <div className="flex justify-center">
                <CoverEditor
                  template={state.selectedCover}
                  decorations={state.decorations}
                  selectedIndex={state.selectedItemIndex}
                  onUpdate={updateDecoration}
                  onSelect={selectItem}
                  onRemove={removeDecoration}
                />
              </div>

              {/* Right: Controls */}
              <div className="space-y-4">
                <CoverTemplateSelector
                  templates={coverTemplates}
                  selectedId={state.selectedCover?.id || null}
                  onSelect={setCover}
                />

                <ItemPalette
                  items={decorationItems}
                  onSelectItem={addDecoration}
                />
              </div>
            </>
          ) : (
            <>
              {/* Paper Selection */}
              <div className="lg:col-span-2">
                <PaperTemplateSelector
                  templates={paperTemplates}
                  selectedId={state.selectedPaper?.id || null}
                  onSelect={setPaper}
                />

                {/* Preview */}
                {state.selectedPaper && (
                  <div className="mt-6 p-6 rounded-xl border border-pastel-pink/30">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                      미리보기
                    </h3>
                    <div
                      className="min-h-[200px] p-4 rounded-lg"
                      style={{
                        backgroundColor: state.selectedPaper.background_color,
                        backgroundImage:
                          state.selectedPaper.line_style === 'lined'
                            ? `repeating-linear-gradient(transparent, transparent 27px, ${state.selectedPaper.line_color} 27px, ${state.selectedPaper.line_color} 28px)`
                            : state.selectedPaper.line_style === 'grid'
                            ? `linear-gradient(${state.selectedPaper.line_color} 1px, transparent 1px), linear-gradient(90deg, ${state.selectedPaper.line_color} 1px, transparent 1px)`
                            : state.selectedPaper.line_style === 'dotted'
                            ? `radial-gradient(circle, ${state.selectedPaper.line_color} 1px, transparent 1px)`
                            : 'none',
                        backgroundSize:
                          state.selectedPaper.line_style === 'grid' ||
                          state.selectedPaper.line_style === 'dotted'
                            ? '28px 28px'
                            : 'auto',
                      }}
                    >
                      <p className="text-gray-600 leading-relaxed">
                        오늘 하루는 정말 좋았다. 아침에 일어나서 창문을 열었더니
                        시원한 바람이 불어왔다. 커피 한 잔을 마시며 하루를
                        시작했다. 오후에는 친구와 함께 카페에 갔다...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function CustomizePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-pastel-cream flex items-center justify-center">
        <div className="text-pastel-purple">로딩 중...</div>
      </div>
    }>
      <CustomizePageContent />
    </Suspense>
  )
}
