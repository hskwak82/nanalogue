'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui'
import { AI_PROMPT_CATEGORY_LIST, type AIPrompt, type AIPromptVersion, type AIPromptCategory } from '@/types/ai-prompts'
import {
  ArrowPathIcon,
  PencilSquareIcon,
  ClockIcon,
  BeakerIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline'

export default function AdminPromptsPage() {
  const { toast } = useToast()
  const [prompts, setPrompts] = useState<AIPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<AIPromptCategory | 'all'>('all')
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null)
  const [editContent, setEditContent] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [versions, setVersions] = useState<AIPromptVersion[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState('')
  const [showTestModal, setShowTestModal] = useState(false)
  const [importing, setImporting] = useState(false)

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    try {
      const url = selectedCategory === 'all'
        ? '/api/admin/prompts'
        : `/api/admin/prompts?category=${selectedCategory}`
      const res = await fetch(url)
      const data = await res.json()
      setPrompts(data.prompts || [])
    } catch (error) {
      console.error('Error fetching prompts:', error)
      toast.error('프롬프트를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, toast])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const handleEdit = async (prompt: AIPrompt) => {
    setEditingPrompt(prompt)
    setEditContent(prompt.content)
    setChangeSummary('')
    setShowVersions(false)
    setVersions([])

    // Fetch versions
    try {
      const res = await fetch(`/api/admin/prompts/${prompt.id}/versions`)
      const data = await res.json()
      setVersions(data.versions || [])
    } catch (error) {
      console.error('Error fetching versions:', error)
    }
  }

  const handleSave = async () => {
    if (!editingPrompt) return

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/prompts/${editingPrompt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          variables: editingPrompt.variables,
          changeSummary: changeSummary || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success('프롬프트가 업데이트되었습니다.')

      setEditingPrompt(null)
      fetchPrompts()
    } catch (error) {
      console.error('Error saving prompt:', error)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleRollback = async (version: number) => {
    if (!editingPrompt) return

    if (!confirm(`버전 ${version}(으)로 롤백하시겠습니까?`)) return

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/prompts/${editingPrompt.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })

      if (!res.ok) throw new Error('Failed to rollback')

      const data = await res.json()
      setEditContent(data.prompt.content)
      setEditingPrompt(data.prompt)

      toast.success(`버전 ${version}(으)로 롤백되었습니다.`)

      // Refresh versions
      const versionsRes = await fetch(`/api/admin/prompts/${editingPrompt.id}/versions`)
      const versionsData = await versionsRes.json()
      setVersions(versionsData.versions || [])
    } catch (error) {
      console.error('Error rolling back:', error)
      toast.error('롤백에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!editingPrompt) return

    setTesting(true)
    setTestResult('')

    try {
      // Build test variables
      const testVariables: Record<string, string> = {}
      for (const varName of editingPrompt.variables) {
        const cleanVar = varName.replace(/\{\{|\}\}/g, '')
        if (cleanVar === 'today') {
          testVariables[cleanVar] = new Date().toISOString().split('T')[0]
        } else if (cleanVar === 'dateInfo') {
          testVariables[cleanVar] = `작성: ${new Date().toLocaleString('ko-KR')}`
        } else if (cleanVar === 'referenceDate') {
          testVariables[cleanVar] = new Date().toISOString().split('T')[0]
        } else {
          testVariables[cleanVar] = `[${cleanVar} 샘플 값]`
        }
      }

      const res = await fetch('/api/admin/prompts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          testInput: testInput || '오늘 하루가 정말 바빴어요. 회사에서 중요한 프레젠테이션도 했고요.',
          variables: testVariables,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setTestResult(`오류: ${data.error}`)
      } else {
        setTestResult(data.response || '응답 없음')
      }
    } catch (error) {
      console.error('Error testing prompt:', error)
      setTestResult('테스트 중 오류가 발생했습니다.')
    } finally {
      setTesting(false)
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
    // Direct download - server handles filename via Content-Disposition
    const categoryParam = selectedCategory === 'all' ? '' : `?category=${selectedCategory}`
    window.location.href = `/api/admin/prompts/export${categoryParam}`
    const categoryLabel = selectedCategory === 'all' ? '전체' : getCategoryLabel(selectedCategory)
    toast.success(`${categoryLabel} 프롬프트가 내보내기되었습니다.`)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (selectedCategory !== 'all') {
        formData.append('category', selectedCategory)
      }

      const res = await fetch('/api/admin/prompts/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import')
      }

      const categoryLabel = selectedCategory === 'all' ? '전체' : getCategoryLabel(selectedCategory)
      toast.success(`${categoryLabel} 가져오기 완료: ${data.updated}개 업데이트, ${data.skipped}개 스킵, ${data.failed}개 실패`)
      fetchPrompts()
    } catch (error) {
      console.error('Error importing prompts:', error)
      toast.error(error instanceof Error ? error.message : '가져오기에 실패했습니다.')
    } finally {
      setImporting(false)
      // Reset the input
      event.target.value = ''
    }
  }

  const getCategoryLabel = (category: string) => {
    const found = AI_PROMPT_CATEGORY_LIST.find(c => c.value === category)
    return found?.label || category
  }

  const filteredPrompts = selectedCategory === 'all'
    ? prompts
    : prompts.filter(p => p.category === selectedCategory)

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
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            내보내기
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
              accept=".zip"
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
          <button
            onClick={() => setSelectedCategory('all')}
            className={`py-3 px-1 border-b-2 text-sm font-medium ${
              selectedCategory === 'all'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            전체
          </button>
          {AI_PROMPT_CATEGORY_LIST.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`py-3 px-1 border-b-2 text-sm font-medium ${
                selectedCategory === cat.value
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Prompts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrompts.map(prompt => (
            <div
              key={prompt.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {getCategoryLabel(prompt.category)}
                    </span>
                    <span className="text-xs text-gray-400">v{prompt.version}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-gray-900">{prompt.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{prompt.description}</p>
                  <div className="mt-3 text-xs text-gray-400 font-mono bg-gray-50 rounded p-2 max-h-24 overflow-hidden">
                    {prompt.content.slice(0, 200)}...
                  </div>
                  {prompt.variables.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {prompt.variables.map((v, i) => (
                        <span key={i} className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleEdit(prompt)}
                  className="ml-4 flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  편집
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{editingPrompt.name}</h2>
                <p className="text-sm text-gray-500">
                  {getCategoryLabel(editingPrompt.category)} &middot; v{editingPrompt.version}
                </p>
              </div>
              <button
                onClick={() => setEditingPrompt(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Content Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프롬프트 내용
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-64 rounded-lg border border-gray-300 p-3 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="프롬프트 내용을 입력하세요..."
                />
              </div>

              {/* Variables */}
              {editingPrompt.variables.length > 0 && (
                <div className="rounded-lg bg-amber-50 p-4">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">사용 가능한 변수</h4>
                  <div className="flex flex-wrap gap-2">
                    {editingPrompt.variables.map((v, i) => (
                      <code key={i} className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Change Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  변경 사항 설명 (선택)
                </label>
                <input
                  type="text"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="예: AI 톤을 더 친근하게 변경"
                />
              </div>

              {/* Version History */}
              <div>
                <button
                  onClick={() => setShowVersions(!showVersions)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <ClockIcon className="h-4 w-4" />
                  버전 이력 {showVersions ? '숨기기' : '보기'}
                </button>
                {showVersions && versions.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {versions.map(v => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">v{v.version}</span>
                          <span className="ml-2 text-gray-500">
                            {new Date(v.created_at).toLocaleString('ko-KR')}
                          </span>
                          {v.change_summary && (
                            <span className="ml-2 text-gray-400">- {v.change_summary}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRollback(v.version)}
                          disabled={saving}
                          className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                        >
                          <ArrowUturnLeftIcon className="h-3 w-3" />
                          롤백
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {showVersions && versions.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">버전 이력이 없습니다.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t px-6 py-4">
              <button
                onClick={() => setShowTestModal(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <BeakerIcon className="h-4 w-4" />
                테스트
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingPrompt(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && editingPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
            {/* Test Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">프롬프트 테스트</h2>
              <button
                onClick={() => setShowTestModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Test Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  테스트 입력
                </label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full h-24 rounded-lg border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="오늘 하루가 정말 바빴어요. 회사에서 중요한 프레젠테이션도 했고요."
                />
              </div>

              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    테스트 중...
                  </>
                ) : (
                  <>
                    <BeakerIcon className="h-4 w-4" />
                    테스트 실행
                  </>
                )}
              </button>

              {testResult && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI 응답
                  </label>
                  <div className="rounded-lg bg-gray-50 p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {testResult}
                  </div>
                </div>
              )}
            </div>

            {/* Test Modal Footer */}
            <div className="flex items-center justify-end border-t px-6 py-4">
              <button
                onClick={() => setShowTestModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
