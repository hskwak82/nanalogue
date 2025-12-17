'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import { Navigation } from '@/components/Navigation'
import { CoverEditor, CoverEditorRef } from '@/components/editor/CoverEditor'
import { PaperEditor } from '@/components/editor/PaperEditor'
import { ItemPalette } from '@/components/editor/ItemPalette'
import { PaperStyleSettings } from '@/components/editor/PaperStyleSettings'
import { TextInputModal } from '@/components/editor/TextInputModal'
import {
  CoverTemplateSelector,
  PaperTemplateSelector,
} from '@/components/editor/TemplateSelector'
import { SpineRegionSelector } from '@/components/editor/SpineRegionSelector'
import { CustomizeBookshelf } from '@/components/editor/CustomizeBookshelf'
import { useEditorState } from '@/lib/editor/useEditorState'
import { useToast } from '@/components/ui'
import type {
  CoverTemplate,
  PaperTemplate,
  DecorationItem,
  CustomizationLoadResponse,
  TextMeta,
} from '@/types/customization'
import type { DiaryWithTemplates } from '@/types/diary'

type TabType = 'cover' | 'paper'

function CustomizePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const diaryIdParam = searchParams.get('diary')
  const { toast } = useToast()

  const coverEditorRef = useRef<CoverEditorRef>(null)

  const [activeTab, setActiveTab] = useState<TabType>('cover')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Text decoration state
  const [isTextMode, setIsTextMode] = useState(false)
  const [isTextModalOpen, setIsTextModalOpen] = useState(false)
  const [pendingTextPosition, setPendingTextPosition] = useState<{ x: number; y: number } | null>(null)
  const [editingTextIndex, setEditingTextIndex] = useState<number | null>(null)

  // Spine region selector state
  const [spinePosition, setSpinePosition] = useState(0) // X position as percentage
  const [savedCoverImageUrl, setSavedCoverImageUrl] = useState<string | null>(null)
  const [isSpineEditMode, setIsSpineEditMode] = useState(false)

  // Data from API
  const [user, setUser] = useState<{ email: string; name: string | null; id: string } | null>(null)
  const [coverTemplates, setCoverTemplates] = useState<CoverTemplate[]>([])
  const [paperTemplates, setPaperTemplates] = useState<PaperTemplate[]>([])
  const [decorationItems, setDecorationItems] = useState<DecorationItem[]>([])
  const [diaryId, setDiaryId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [allDiaries, setAllDiaries] = useState<DiaryWithTemplates[]>([])
  const [activeDiaryId, setActiveDiaryId] = useState<string | null>(null)

  // Editor state
  const {
    state,
    setCover,
    setPaper,
    setActiveEditor,
    addDecoration,
    addCoverDecoration,
    addPaperDecoration,
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
    if (editingTextIndex !== null) {
      // Editing existing text
      updateDecoration(editingTextIndex, {
        content: text,
        text_meta: textMeta,
      })
      setEditingTextIndex(null)
    } else if (pendingTextPosition) {
      // Adding new text - use appropriate function based on active tab
      const newDecoration = {
        item_id: `text-${Date.now()}`,
        type: 'text' as const,
        content: text,
        text_meta: textMeta,
        x: pendingTextPosition.x,
        y: pendingTextPosition.y,
      }

      if (activeTab === 'cover') {
        addCoverDecoration(newDecoration)
      } else {
        addPaperDecoration(newDecoration)
      }
      setPendingTextPosition(null)
    }
  }

  // Handle text double click for editing
  const handleTextDoubleClick = (index: number) => {
    setEditingTextIndex(index)
    setIsTextModalOpen(true)
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

  // Load customization for a specific diary
  const loadDiaryCustomization = useCallback(async (targetDiaryId: string, templates?: { cover: CoverTemplate[], paper: PaperTemplate[] }) => {
    try {
      const url = `/api/customization/load?diaryId=${targetDiaryId}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to load customization data')
      }

      const data: CustomizationLoadResponse & { diaryId?: string; coverImageUrl?: string | null; spinePosition?: number } = await response.json()

      const coverTmpl = templates?.cover || coverTemplates
      const paperTmpl = templates?.paper || paperTemplates

      if (data.diaryId) {
        setDiaryId(data.diaryId)
      }

      // Load existing customization
      if (data.customization) {
        const cover = coverTmpl.find(
          (t) => t.id === data.customization?.cover_template_id
        ) || null
        const paper = paperTmpl.find(
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

        // Load saved cover image URL for spine selector (spine is cropped from cover)
        if (data.coverImageUrl) {
          setSavedCoverImageUrl(data.coverImageUrl)
        } else {
          setSavedCoverImageUrl(null)
        }
      } else if (coverTmpl.length > 0) {
        // Set default cover
        setCover(coverTmpl[0])
        setSavedCoverImageUrl(null)
      }

      // Load spine position for this diary (default to 0 if not set)
      setSpinePosition(data.spinePosition ?? 0)
    } catch (err) {
      console.error('Error loading diary customization:', err)
      setError('데이터를 불러오는 데 실패했습니다.')
    }
  }, [coverTemplates, paperTemplates, loadState, setCover])

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all diaries for bookshelf
        const diariesResponse = await fetch('/api/diaries')
        if (diariesResponse.ok) {
          const diariesData = await diariesResponse.json()
          setAllDiaries(diariesData.diaries || [])
          // Find and set active diary ID
          const activeOne = (diariesData.diaries || []).find((d: DiaryWithTemplates) => d.status === 'active')
          if (activeOne) {
            setActiveDiaryId(activeOne.id)
          }
        }

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

        const data: CustomizationLoadResponse & { diaryId?: string; isPremium?: boolean; coverImageUrl?: string | null; spinePosition?: number; user: { id: string; email: string; name: string | null } } = await response.json()

        setUser(data.user as { id: string; email: string; name: string | null })
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

          // Load saved cover image URL for spine selector
          if (data.coverImageUrl) {
            setSavedCoverImageUrl(data.coverImageUrl)
          }

          // Load spine position for this diary
          setSpinePosition(data.spinePosition ?? 0)
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

  // Handle diary selection from bookshelf
  const handleSelectDiary = useCallback((diary: DiaryWithTemplates) => {
    if (diary.id === diaryId) return // Already selected
    loadDiaryCustomization(diary.id)
  }, [diaryId, loadDiaryCustomization])

  // Save customization
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      let coverImageUrl: string | undefined

      // Capture cover canvas as image if we have a diary and user
      if (diaryId && user?.id && coverEditorRef.current) {
        const canvasElement = coverEditorRef.current.getCanvasElement()
        if (canvasElement) {
          try {
            // Use html-to-image for more accurate transform handling
            // Temporarily suppress cssRules security errors from external fonts
            const originalError = console.error
            console.error = (...args) => {
              if (args[0]?.toString().includes('cssRules')) return
              originalError.apply(console, args)
            }

            let imageBase64: string
            try {
              imageBase64 = await toPng(canvasElement, {
                width: 300,
                height: 400,
                pixelRatio: 2,
                cacheBust: true,
                skipFonts: true, // Skip font processing to avoid CORS issues
              })
            } finally {
              console.error = originalError
            }

            // Upload via server-side API (bypasses RLS)
            const uploadResponse = await fetch('/api/customization/upload-cover', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                diaryId,
                imageBase64,
              }),
            })

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json()
              if (uploadResult.success && uploadResult.url) {
                coverImageUrl = uploadResult.url
                // Update saved cover image URL for spine selector
                setSavedCoverImageUrl(uploadResult.url)
              }
            }
            // Spine is displayed by cropping cover_image_url - no separate spine image needed
          } catch (captureErr) {
            console.warn('Failed to capture cover image:', captureErr)
            // Continue without cover image - don't block save
          }
        }
      }

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
          cover_image_url: coverImageUrl,
          spine_position: spinePosition,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      // Refresh diaries to update bookshelf with new cover/spine images
      const diariesResponse = await fetch('/api/diaries')
      if (diariesResponse.ok) {
        const diariesData = await diariesResponse.json()
        setAllDiaries(diariesData.diaries || [])
      }

      markSaved()
      // Exit all editing modes and deselect items after save
      setIsSpineEditMode(false)
      setIsTextMode(false)
      selectItem(null)
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
        <div className="flex items-center gap-4 mb-6">
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

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs + Save Button */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('cover')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'cover'
                ? 'bg-pastel-pink text-gray-700'
                : 'bg-white/70 text-gray-600 hover:bg-white'
            }`}
          >
            표지 꾸미기
          </button>
          <button
            onClick={() => setActiveTab('paper')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'paper'
                ? 'bg-pastel-mint text-gray-700'
                : 'bg-white/70 text-gray-600 hover:bg-white'
            }`}
          >
            속지 꾸미기
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              isSaving
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-pastel-purple text-white hover:bg-pastel-purple-dark'
            }`}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeTab === 'cover' ? (
            <>
              {/* Left: Cover Editor with Spine Preview */}
              <div className="flex flex-col items-start gap-4">
                {/* Cover + Spine side by side */}
                <div className="flex items-start">
                  {/* Cover Editor wrapper with relative positioning for overlay */}
                  <div className="relative flex flex-col items-center" data-cover-editor style={{ width: 300 }}>
                    <CoverEditor
                      ref={coverEditorRef}
                      template={state.selectedCover}
                      decorations={state.coverDecorations}
                      selectedIndex={state.selectedItemIndex}
                      onUpdate={updateDecoration}
                      onSelect={selectItem}
                      onRemove={removeDecoration}
                      isTextMode={isTextMode}
                      onCanvasClick={handleCanvasClickForText}
                      onTextDoubleClick={handleTextDoubleClick}
                    />
                    {/* Text Button + Delete Button */}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIsTextMode(!isTextMode)
                          if (!isTextMode) setIsSpineEditMode(false)
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                          isTextMode
                            ? 'bg-pastel-purple text-white ring-2 ring-pastel-purple/50'
                            : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200'
                        }`}
                      >
                        <span className="text-base">T</span>
                        텍스트
                      </button>
                      {/* Delete button - shows when item is selected */}
                      {state.selectedItemIndex !== null && (
                        <button
                          onClick={() => removeDecoration(state.selectedItemIndex!)}
                          className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          삭제
                        </button>
                      )}
                    </div>
                    {/* SpineRegionSelector overlay renders here when editing */}
                    <SpineRegionSelector
                      coverImageUrl={savedCoverImageUrl}
                      coverRef={{ current: coverEditorRef.current?.getCanvasElement() || null }}
                      initialPosition={spinePosition}
                      onPositionChange={setSpinePosition}
                      isEditing={isSpineEditMode}
                      onEditingChange={setIsSpineEditMode}
                      onEditButtonClick={() => {
                        setIsSpineEditMode(!isSpineEditMode)
                        if (!isSpineEditMode) setIsTextMode(false)
                      }}
                      disabled={state.isDirty}
                    />

                  </div>
                </div>

                {/* Bookshelf - below buttons */}
                {allDiaries.length > 0 && (
                  <div className="mt-6 w-full max-w-2xl">
                    <CustomizeBookshelf
                      diaries={allDiaries}
                      activeDiaryId={activeDiaryId}
                      selectedDiaryId={diaryId}
                      onSelectDiary={handleSelectDiary}
                    />
                  </div>
                )}
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
              {/* Left: Paper Editor with Spine Preview */}
              <div className="flex flex-col items-start gap-4">
                {/* Paper + Spine side by side */}
                <div className="flex items-start">
                  <div className="relative flex flex-col items-center" style={{ width: 320 }}>
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
                      isTextMode={isTextMode}
                      onCanvasClick={handleCanvasClickForText}
                      onTextDoubleClick={handleTextDoubleClick}
                    />

                    {/* Text Button + Delete Button for Paper */}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => setIsTextMode(!isTextMode)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                          isTextMode
                            ? 'bg-pastel-mint text-white ring-2 ring-pastel-mint/50'
                            : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200'
                        }`}
                      >
                        <span className="text-base">T</span>
                        텍스트
                      </button>
                      {/* Delete button - shows when item is selected */}
                      {state.selectedItemIndex !== null && (
                        <button
                          onClick={() => removeDecoration(state.selectedItemIndex!)}
                          className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          삭제
                        </button>
                      )}
                    </div>

                    {/* Spine preview - no edit button */}
                    <SpineRegionSelector
                      coverImageUrl={savedCoverImageUrl}
                      coverRef={{ current: null }}
                      initialPosition={spinePosition}
                      hideButton={true}
                    />
                  </div>
                </div>

                {/* Bookshelf - below buttons */}
                {allDiaries.length > 0 && (
                  <div className="mt-6 w-full max-w-2xl">
                    <CustomizeBookshelf
                      diaries={allDiaries}
                      activeDiaryId={activeDiaryId}
                      selectedDiaryId={diaryId}
                      onSelectDiary={handleSelectDiary}
                    />
                  </div>
                )}
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
          setEditingTextIndex(null)
        }}
        onConfirm={handleTextConfirm}
        initialText={editingTextIndex !== null
          ? (activeTab === 'cover' ? state.coverDecorations : state.paperDecorations)[editingTextIndex]?.content
          : ''
        }
        initialMeta={editingTextIndex !== null
          ? (activeTab === 'cover' ? state.coverDecorations : state.paperDecorations)[editingTextIndex]?.text_meta
          : undefined
        }
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
