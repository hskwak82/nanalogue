'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { CoverEditor } from '@/components/editor/CoverEditor'
import { PaperEditor } from '@/components/editor/PaperEditor'
import { ItemPalette } from '@/components/editor/ItemPalette'
import { PaperStyleSettings } from '@/components/editor/PaperStyleSettings'
import { TextInputModal } from '@/components/editor/TextInputModal'
import {
  CoverTemplateSelector,
  PaperTemplateSelector,
} from '@/components/editor/TemplateSelector'
import { useEditorState } from '@/lib/editor/useEditorState'
import { useToast } from '@/components/ui'
import type {
  CoverTemplate,
  PaperTemplate,
  DecorationItem,
  CustomizationLoadResponse,
  TextMeta,
} from '@/types/customization'

type TabType = 'cover' | 'paper'

function CustomizePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const diaryIdParam = searchParams.get('diary')
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('cover')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Text decoration state
  const [isTextMode, setIsTextMode] = useState(false)
  const [isTextModalOpen, setIsTextModalOpen] = useState(false)
  const [pendingTextPosition, setPendingTextPosition] = useState<{ x: number; y: number } | null>(null)

  // Data from API
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null)
  const [coverTemplates, setCoverTemplates] = useState<CoverTemplate[]>([])
  const [paperTemplates, setPaperTemplates] = useState<PaperTemplate[]>([])
  const [decorationItems, setDecorationItems] = useState<DecorationItem[]>([])
  const [diaryId, setDiaryId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)

  // Editor state
  const {
    state,
    setCover,
    setPaper,
    setActiveEditor,
    addDecoration,
    addCoverDecoration,
    updateDecoration,
    removeDecoration,
    selectItem,
    loadState,
    markSaved,
    setPaperOpacity,
    setPaperFontFamily,
    setPaperFontColor,
  } = useEditorState()

  // Handle canvas click in text mode
  const handleCanvasClickForText = (x: number, y: number) => {
    if (isTextMode) {
      setPendingTextPosition({ x, y })
      setIsTextModalOpen(true)
      setIsTextMode(false)
    }
  }

  // Handle text confirmation from modal
  const handleTextConfirm = (text: string, textMeta: TextMeta) => {
    if (!pendingTextPosition) return

    addCoverDecoration({
      item_id: `text-${Date.now()}`,
      type: 'text',
      content: text,
      text_meta: textMeta,
      x: pendingTextPosition.x,
      y: pendingTextPosition.y,
    })

    setPendingTextPosition(null)
  }

  // Sync active tab with active editor
  useEffect(() => {
    setActiveEditor(activeTab)
  }, [activeTab, setActiveEditor])

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete or Backspace key to remove selected decoration
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedItemIndex !== null) {
        // Prevent default backspace navigation
        e.preventDefault()
        removeDecoration(state.selectedItemIndex)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.selectedItemIndex, removeDecoration])

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

        const data: CustomizationLoadResponse & { diaryId?: string; isPremium?: boolean } = await response.json()

        setUser(data.user)
        setCoverTemplates(data.coverTemplates)
        setPaperTemplates(data.paperTemplates)
        setDecorationItems(data.decorationItems)
        setIsPremium(data.isPremium || false)
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

          loadState(
            cover,
            paper,
            data.customization.cover_decorations || [],
            data.customization.paper_decorations || [],
            data.customization.paper_opacity,
            data.customization.paper_font_family,
            data.customization.paper_font_color
          )
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
          cover_decorations: state.coverDecorations,
          paper_decorations: state.paperDecorations,
          paper_opacity: state.paperOpacity,
          paper_font_family: state.paperFontFamily,
          paper_font_color: state.paperFontColor,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      markSaved()
      toast.success('저장되었습니다!')
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
                ? 'bg-pastel-mint text-white'
                : 'bg-white/70 text-gray-600 hover:bg-white'
            }`}
          >
            속지 꾸미기
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeTab === 'cover' ? (
            <>
              {/* Left: Cover Editor */}
              <div className="flex flex-col items-center gap-4">
                <CoverEditor
                  template={state.selectedCover}
                  decorations={state.coverDecorations}
                  selectedIndex={state.selectedItemIndex}
                  onUpdate={updateDecoration}
                  onSelect={selectItem}
                  onRemove={removeDecoration}
                  isTextMode={isTextMode}
                  onCanvasClick={handleCanvasClickForText}
                />

                {/* Text Button */}
                <button
                  onClick={() => setIsTextMode(!isTextMode)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                    isTextMode
                      ? 'bg-pastel-purple text-white ring-2 ring-pastel-purple/50'
                      : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200'
                  }`}
                >
                  <span className="text-lg">T</span>
                  텍스트
                  {isTextMode && <span className="text-xs opacity-80">(클릭하여 위치 선택)</span>}
                </button>
              </div>

              {/* Right: Controls */}
              <div className="space-y-4">
                <CoverTemplateSelector
                  templates={coverTemplates}
                  selectedId={state.selectedCover?.id || null}
                  onSelect={setCover}
                  isPremium={isPremium}
                />

                <ItemPalette
                  items={decorationItems}
                  onSelectItem={addDecoration}
                  isPremium={isPremium}
                />
              </div>
            </>
          ) : (
            <>
              {/* Left: Paper Editor */}
              <div className="flex justify-center">
                <PaperEditor
                  template={state.selectedPaper}
                  decorations={state.paperDecorations}
                  selectedIndex={state.selectedItemIndex}
                  onUpdate={updateDecoration}
                  onSelect={selectItem}
                  onRemove={removeDecoration}
                  paperOpacity={state.paperOpacity}
                  paperFontFamily={state.paperFontFamily}
                  paperFontColor={state.paperFontColor}
                />
              </div>

              {/* Right: Controls */}
              <div className="space-y-4">
                <PaperTemplateSelector
                  templates={paperTemplates}
                  selectedId={state.selectedPaper?.id || null}
                  onSelect={setPaper}
                  isPremium={isPremium}
                />

                <PaperStyleSettings
                  opacity={state.paperOpacity}
                  fontFamily={state.paperFontFamily}
                  fontColor={state.paperFontColor}
                  onOpacityChange={setPaperOpacity}
                  onFontFamilyChange={setPaperFontFamily}
                  onFontColorChange={setPaperFontColor}
                />

                <ItemPalette
                  items={decorationItems}
                  onSelectItem={addDecoration}
                  isPremium={isPremium}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Text Input Modal */}
      <TextInputModal
        isOpen={isTextModalOpen}
        onClose={() => {
          setIsTextModalOpen(false)
          setPendingTextPosition(null)
        }}
        onConfirm={handleTextConfirm}
      />
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
