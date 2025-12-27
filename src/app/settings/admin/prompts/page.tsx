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
  BeakerIcon,
  PlayIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

// Test presets for each category
const TEST_PRESETS: Record<string, Array<{ label: string; input: string }>> = {
  chat: [
    { label: '일상 대화', input: '오늘 회사에서 발표를 했어요. 좀 긴장했는데 잘 끝났어요.' },
    { label: '감정 표현', input: '요즘 너무 피곤해요. 일이 많아서 쉴 시간이 없네요.' },
    { label: '일정 언급', input: '내일 3시에 병원 예약이 있어요. 건강검진 받으러 가요.' },
    { label: '짧은 응답', input: '그냥 그래요.' },
  ],
  diary: [
    { label: '하루 요약', input: '오늘은 아침에 운동하고, 점심에 친구 만나서 맛있는 거 먹고, 저녁에는 영화 봤어요.' },
    { label: '감정 중심', input: '오늘 정말 행복한 하루였어요. 오랜만에 가족들이랑 시간 보냈거든요.' },
  ],
  schedule: [
    { label: '구체적 일정', input: '다음주 월요일 오후 2시에 팀 미팅 있어요.' },
    { label: '기간 일정', input: '7월 15일부터 20일까지 여행 가요.' },
    { label: '반복 일정', input: '매주 화요일 저녁 7시에 요가 수업이에요.' },
  ],
}

// Prompt order for each category (personality first as base style)
const PROMPT_ORDER: Record<string, string[]> = {
  chat: [
    'chat.personality',
    'chat.greeting',
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
  const [showTestModal, setShowTestModal] = useState(false)
  const [testPromptKey, setTestPromptKey] = useState<string>('')
  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState('')
  const [testing, setTesting] = useState(false)

  // Full conversation test
  const [showFullTestModal, setShowFullTestModal] = useState(false)
  const [fullTestMessages, setFullTestMessages] = useState<ConversationMessage[]>([])
  const [fullTestInput, setFullTestInput] = useState('')
  const [fullTestLoading, setFullTestLoading] = useState(false)
  const [fullTestQuestionCount, setFullTestQuestionCount] = useState(0)
  const [fullTestEnded, setFullTestEnded] = useState(false)

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

  // Parse unified MD content back to prompts (flexible parsing)
  const parseUnifiedMd = useCallback((mdContent: string): Array<{ prompt_key: string; content: string; variables: string[] }> => {
    const parsed: Array<{ prompt_key: string; content: string; variables: string[] }> = []
    const sections = mdContent.split(/^---$/m)

    for (const section of sections) {
      const trimmed = section.trim()
      if (!trimmed) continue

      // Extract prompt_key from `## category.key`
      const keyMatch = trimmed.match(/^## ([a-z]+\.[a-z_]+)/m)
      if (!keyMatch) continue

      const prompt_key = keyMatch[1]

      // Extract variables from `- **변수**: {{today}}, {{name}}`
      const varsMatch = trimmed.match(/- \*\*변수\*\*:\s*(.+)/)
      let variables: string[] = []
      if (varsMatch) {
        const varMatches = varsMatch[1].match(/\{\{([^}]+)\}\}/g)
        if (varMatches) {
          variables = varMatches.map(v => v.slice(2, -2))
        }
      }

      // Flexible content extraction:
      // 1. Try code block first: ### 프롬프트 내용 followed by ```...```
      let content = ''
      const codeBlockMatch = trimmed.match(/### 프롬프트 내용\s*\n+```\n([\s\S]*?)\n```/)

      if (codeBlockMatch) {
        content = codeBlockMatch[1]
      } else {
        // 2. Fallback: Get everything after metadata lines
        const lines = trimmed.split('\n')
        const contentLines: string[] = []
        let foundKey = false
        let pastMetadata = false

        for (const line of lines) {
          // Skip until we find the ## key line
          if (line.match(/^## [a-z]+\.[a-z_]+/)) {
            foundKey = true
            continue
          }
          if (!foundKey) continue

          // Skip metadata lines
          if (line.match(/^- \*\*(이름|설명|변수)\*\*:/)) {
            continue
          }

          // Skip ### 프롬프트 내용 header
          if (line.match(/^### 프롬프트 내용/)) {
            continue
          }

          // Skip empty lines right after metadata
          if (!pastMetadata && line.trim() === '') {
            continue
          }

          pastMetadata = true
          contentLines.push(line)
        }

        content = contentLines.join('\n').trim()
      }

      if (!content) continue

      parsed.push({
        prompt_key,
        content,
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

  const handleOpenTest = (promptKey: string) => {
    setTestPromptKey(promptKey)
    setTestInput('')
    setTestResult('')
    setShowTestModal(true)
  }

  const handleRunTest = async () => {
    const prompt = prompts.find(p => p.prompt_key === testPromptKey)
    if (!prompt) return

    setTesting(true)
    setTestResult('')

    try {
      // Prepare sample variables for testing
      const sampleVariables: Record<string, string> = {}
      for (const v of prompt.variables) {
        if (v === 'today') {
          sampleVariables[v] = new Date().toLocaleDateString('ko-KR')
        } else if (v === 'userName') {
          sampleVariables[v] = '테스트 사용자'
        } else if (v === 'conversationPhase') {
          sampleVariables[v] = 'early'
        } else {
          sampleVariables[v] = `[${v}]`
        }
      }

      const res = await fetch('/api/admin/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: prompt.content,
          testInput,
          variables: sampleVariables,
          promptKey: prompt.prompt_key,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Test failed')
      }

      setTestResult(data.response || '응답 없음')
    } catch (error) {
      console.error('Error testing prompt:', error)
      setTestResult(`오류: ${error instanceof Error ? error.message : '테스트 실패'}`)
    } finally {
      setTesting(false)
    }
  }

  const currentPresets = TEST_PRESETS[selectedCategory] || []

  // Full conversation test functions
  const handleStartFullTest = async () => {
    setShowFullTestModal(true)
    setFullTestMessages([])
    setFullTestInput('')
    setFullTestQuestionCount(0)
    setFullTestEnded(false)
    setFullTestLoading(true)

    try {
      // Get initial greeting
      const res = await fetch('/api/chat/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          questionCount: 0,
        }),
      })

      const data = await res.json()
      setFullTestMessages([{ role: 'assistant', content: data.question }])
      setFullTestQuestionCount(1)
    } catch (error) {
      console.error('Error starting full test:', error)
      toast.error('테스트 시작에 실패했습니다.')
    } finally {
      setFullTestLoading(false)
    }
  }

  const handleSendFullTestMessage = async () => {
    if (!fullTestInput.trim() || fullTestLoading || fullTestEnded) return

    const userMessage = fullTestInput.trim()
    setFullTestInput('')
    setFullTestLoading(true)

    // Add user message
    const updatedMessages: ConversationMessage[] = [
      ...fullTestMessages,
      { role: 'user', content: userMessage },
    ]
    setFullTestMessages(updatedMessages)

    try {
      const res = await fetch('/api/chat/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          questionCount: fullTestQuestionCount,
        }),
      })

      const data = await res.json()

      setFullTestMessages([
        ...updatedMessages,
        { role: 'assistant', content: data.question },
      ])
      setFullTestQuestionCount(prev => prev + 1)

      if (data.shouldEnd) {
        setFullTestEnded(true)
      }
    } catch (error) {
      console.error('Error in full test:', error)
      toast.error('응답 생성에 실패했습니다.')
    } finally {
      setFullTestLoading(false)
    }
  }

  const handleCloseFullTest = () => {
    setShowFullTestModal(false)
    setFullTestMessages([])
    setFullTestInput('')
    setFullTestQuestionCount(0)
    setFullTestEnded(false)
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
          {selectedCategory === 'chat' && (
            <button
              onClick={handleStartFullTest}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <PlayIcon className="h-4 w-4" />
              전체 대화 테스트
            </button>
          )}
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-gray-900 font-mono">
                            ## {prompt.prompt_key}
                          </h3>
                          <span className="text-xs text-gray-400">v{prompt.version}</span>
                        </div>
                        <button
                          onClick={() => handleOpenTest(prompt.prompt_key)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                          title="프롬프트 테스트"
                        >
                          <BeakerIcon className="h-3.5 w-3.5" />
                          테스트
                        </button>
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

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">프롬프트 테스트</h2>
                <p className="text-sm text-gray-500 font-mono">{testPromptKey}</p>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Preset Selection */}
              {currentPresets.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    프리셋 선택
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {currentPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => setTestInput(preset.input)}
                        className={`px-3 py-1.5 text-sm rounded-full border ${
                          testInput === preset.input
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  테스트 입력
                </label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="테스트할 사용자 입력을 작성하세요..."
                  className="w-full h-24 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Test Result */}
              {testResult && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI 응답
                  </label>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                      {testResult}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                onClick={handleRunTest}
                disabled={testing || !testInput.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    테스트 중...
                  </>
                ) : (
                  <>
                    <BeakerIcon className="h-4 w-4" />
                    테스트 실행
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Conversation Test Modal */}
      {showFullTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">전체 대화 테스트</h2>
                <p className="text-sm text-gray-500">
                  실제 일기 대화 흐름을 테스트합니다 (질문 {fullTestQuestionCount}/7)
                </p>
              </div>
              <button
                onClick={handleCloseFullTest}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {fullTestMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {fullTestLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                      응답 생성 중...
                    </div>
                  </div>
                </div>
              )}
              {fullTestEnded && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">대화가 종료되었습니다.</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 shrink-0">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={fullTestInput}
                  onChange={(e) => setFullTestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendFullTestMessage()
                    }
                  }}
                  placeholder={fullTestEnded ? '대화가 종료되었습니다' : '메시지를 입력하세요...'}
                  disabled={fullTestLoading || fullTestEnded}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
                <button
                  onClick={handleSendFullTestMessage}
                  disabled={fullTestLoading || fullTestEnded || !fullTestInput.trim()}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {TEST_PRESETS.chat.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setFullTestInput(preset.input)}
                    disabled={fullTestLoading || fullTestEnded}
                    className="px-3 py-1 text-xs rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
