'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/components/ui'
import { AI_PROMPT_CATEGORY_LIST, AI_PROMPT_CATEGORIES, type AIPrompt, type AIPromptCategory } from '@/types/ai-prompts'
import {
  ArrowPathIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'

// Prompt order for each category
const PROMPT_ORDER: Record<string, string[]> = {
  chat: [
    'chat.greeting',
    'chat.personality',
    'chat.phase_early',
    'chat.phase_mid',
    'chat.phase_late',
    'chat.closing',
    'chat.schedule_detection',
    'chat.response_format',
  ],
  diary: [
    'diary.write_style',
    'diary.metadata_extraction',
  ],
  schedule: [
    'schedule.parsing',
  ],
}

export default function AdminPromptsPage() {
  const { toast } = useToast()
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<AIPromptCategory>('chat')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/prompts')
      const data = await res.json()
      setPrompts(data.prompts || [])
    } catch (error) {
      console.error('Error fetching prompts:', error)
      toast.error('프롬프트를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  // Get prompts for selected category in correct order
  const categoryPrompts = useMemo(() => {
    const order = PROMPT_ORDER[selectedCategory] || []
    const categoryPromptsMap = new Map(
      prompts
        .filter(p => p.category === selectedCategory)
        .map(p => [p.prompt_key, p])
    )
    return order
      .map(key => categoryPromptsMap.get(key))
      .filter((p): p is AIPrompt => p !== undefined)
  }, [prompts, selectedCategory])

  // Generate unified MD content for display/edit
  const generateUnifiedMd = useCallback((promptsList: AIPrompt[]) => {
    const categoryLabel = AI_PROMPT_CATEGORIES[selectedCategory as keyof typeof AI_PROMPT_CATEGORIES] || selectedCategory
    let md = `# ${categoryLabel} (${selectedCategory})\n\n`

    for (const prompt of promptsList) {
      md += `---\n\n`
      md += `## ${prompt.prompt_key}\n\n`
      md += `- **이름**: ${prompt.name}\n`
      md += `- **설명**: ${prompt.description || '없음'}\n`
      if (prompt.variables.length > 0) {
        md += `- **변수**: ${prompt.variables.map(v => `{{${v}}}`).join(', ')}\n`
      }
      md += `\n### 프롬프트 내용\n\n`
      md += '```\n'
      md += prompt.content
      md += '\n```\n\n'
    }

    return md
  }, [selectedCategory])

  // Parse unified MD content back to prompts
  const parseUnifiedMd = useCallback((mdContent: string): Array<{ prompt_key: string; content: string; variables: string[] }> => {
    const parsed: Array<{ prompt_key: string; content: string; variables: string[] }> = []
    const sections = mdContent.split(/^---$/m)

    for (const section of sections) {
      const trimmed = section.trim()
      if (!trimmed) continue

      const keyMatch = trimmed.match(/^## ([a-z]+\.[a-z_]+)/m)
      if (!keyMatch) continue

      const prompt_key = keyMatch[1]

      const varsMatch = trimmed.match(/- \*\*변수\*\*:\s*(.+)/)
      let variables: string[] = []
      if (varsMatch) {
        const varMatches = varsMatch[1].match(/\{\{([^}]+)\}\}/g)
        if (varMatches) {
          variables = varMatches.map(v => v.slice(2, -2))
        }
      }

      const contentMatch = trimmed.match(/### 프롬프트 내용\s*\n+```\n([\s\S]*?)\n```/)
      if (!contentMatch) continue

      parsed.push({
        prompt_key,
        content: contentMatch[1],
        variables,
      })
    }

    return parsed
  }, [])

  const handleStartEdit = () => {
    setEditContent(generateUnifiedMd(categoryPrompts))
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const parsedPrompts = parseUnifiedMd(editContent)

      let updatedCount = 0
      let errorCount = 0

      for (const parsed of parsedPrompts) {
        const existing = prompts.find(p => p.prompt_key === parsed.prompt_key)
        if (!existing) continue

        // Skip if no changes
        if (existing.content === parsed.content) continue

        try {
          const res = await fetch(`/api/admin/prompts/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: parsed.content,
              variables: parsed.variables,
              changeSummary: '통합 편집기에서 수정',
            }),
          })

          if (res.ok) {
            updatedCount++
          } else {
            errorCount++
          }
        } catch {
          errorCount++
        }
      }

      if (errorCount > 0) {
        toast.error(`${errorCount}개 프롬프트 저장 실패`)
      } else if (updatedCount > 0) {
        toast.success(`${updatedCount}개 프롬프트가 업데이트되었습니다.`)
      } else {
        toast.success('변경사항이 없습니다.')
      }

      setIsEditing(false)
      fetchPrompts()
    } catch (error) {
      console.error('Error saving prompts:', error)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleClearCache = async () => {
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-cache' }),
      })

      if (!res.ok) throw new Error('Failed to clear cache')

      toast.success('프롬프트 캐시가 초기화되었습니다.')
    } catch (error) {
      console.error('Error clearing cache:', error)
      toast.error('캐시 초기화에 실패했습니다.')
    }
  }

  const handleExport = () => {
    window.location.href = `/api/admin/prompts/export?category=${selectedCategory}`
    const categoryLabel = AI_PROMPT_CATEGORIES[selectedCategory as keyof typeof AI_PROMPT_CATEGORIES]
    toast.success(`${categoryLabel}.md 파일이 다운로드됩니다.`)
  }

  const handleExportAll = async () => {
    try {
      const res = await fetch('/api/admin/prompts/export')
      const data = await res.json()

      if (data.files) {
        // Download each MD file
        for (const [category, content] of Object.entries(data.files)) {
          const blob = new Blob([content as string], { type: 'text/markdown' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${category}.md`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        toast.success(`${Object.keys(data.files).length}개 MD 파일이 다운로드되었습니다.`)
      }
    } catch (error) {
      console.error('Error exporting all prompts:', error)
      toast.error('내보내기에 실패했습니다.')
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setImporting(true)
    try {
      const formData = new FormData()
      // Support multiple file selection
      for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i])
      }

      const res = await fetch('/api/admin/prompts/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import')
      }

      toast.success(`가져오기 완료: ${data.updated}개 업데이트, ${data.skipped}개 스킵, ${data.failed}개 실패`)
      fetchPrompts()
    } catch (error) {
      console.error('Error importing prompts:', error)
      toast.error(error instanceof Error ? error.message : '가져오기에 실패했습니다.')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const getCategoryLabel = (category: string) => {
    return AI_PROMPT_CATEGORIES[category as keyof typeof AI_PROMPT_CATEGORIES] || category
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 프롬프트 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI 대화의 성격, 스타일, 규칙을 설정합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            전체 내보내기
          </button>
          <label className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 cursor-pointer">
            {importing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent" />
            ) : (
              <ArrowUpTrayIcon className="h-4 w-4" />
            )}
            가져오기
            <input
              type="file"
              accept=".md"
              multiple
              onChange={handleImport}
              className="hidden"
              disabled={importing}
            />
          </label>
          <button
            onClick={handleClearCache}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <ArrowPathIcon className="h-4 w-4" />
            캐시 초기화
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {AI_PROMPT_CATEGORY_LIST.map(cat => (
            <button
              key={cat.value}
              onClick={() => {
                setSelectedCategory(cat.value)
                setIsEditing(false)
              }}
              className={`py-3 px-1 border-b-2 text-sm font-medium ${
                selectedCategory === cat.value
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {cat.label}
              <span className="ml-2 text-xs text-gray-400">
                ({PROMPT_ORDER[cat.value]?.length || 0})
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {getCategoryLabel(selectedCategory)}
              </span>
              <span className="text-xs text-gray-400">
                {categoryPrompts.length}개 프롬프트
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                내보내기
              </button>
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(editContent)
                      toast.success('클립보드에 복사되었습니다.')
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    title="MD 내용 복사"
                  >
                    <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                    복사
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckIcon className="h-3.5 w-3.5" />
                    )}
                    저장
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" />
                  편집
                </button>
              )}
            </div>
          </div>

          {/* Unified Content View / Editor */}
          <div className="p-4">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-[600px] rounded-lg border border-gray-300 p-4 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-gray-50"
                placeholder="프롬프트 내용을 편집하세요..."
              />
            ) : (
              <div className="space-y-6">
                {categoryPrompts.map((prompt, index) => (
                  <div key={prompt.id}>
                    {index > 0 && (
                      <hr className="border-gray-200 mb-6" />
                    )}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900 font-mono">
                          ## {prompt.prompt_key}
                        </h3>
                        <span className="text-xs text-gray-400">v{prompt.version}</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>- <strong>이름</strong>: {prompt.name}</p>
                        <p>- <strong>설명</strong>: {prompt.description || '없음'}</p>
                        {prompt.variables.length > 0 && (
                          <p>- <strong>변수</strong>: {prompt.variables.map(v => `{{${v}}}`).join(', ')}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">### 프롬프트 내용</p>
                        <pre className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-800 whitespace-pre-wrap overflow-x-auto border border-gray-200">
                          {prompt.content}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
