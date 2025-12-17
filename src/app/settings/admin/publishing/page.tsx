'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  BookOpenIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  StopIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useToast, useConfirm } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { PRINT_SPECS } from '@/lib/publishing/print-constants'
import {
  generateFrontCoverPDF,
  generateBackCoverPDF,
  generateSpinePDF,
  generateInnerPagesPDF,
  createPublishingZip,
  uploadZipToStorage,
} from '@/lib/publishing/client-pdf-generator'
import type { PublishableDiary, PublishJobWithDiary } from '@/types/publishing'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
  })
  if (!endDate) return `${start} ~ 현재`
  const end = new Date(endDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
  })
  return `${start} ~ ${end}`
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <ClockIcon className="h-3 w-3" />
          대기중
        </span>
      )
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <ArrowPathIcon className="h-3 w-3 animate-spin" />
          처리중
        </span>
      )
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircleIcon className="h-3 w-3" />
          완료
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <ExclamationCircleIcon className="h-3 w-3" />
          실패
        </span>
      )
    default:
      return null
  }
}

// Cover preview component
function CoverPreview({ imageUrl, title }: { imageUrl: string | null; title: string | null }) {
  const aspectRatio = PRINT_SPECS.PRINT_ASPECT_RATIO // 0.72

  return (
    <div
      className="relative bg-gray-100 rounded overflow-hidden shadow-sm"
      style={{
        width: '48px',
        height: `${48 / aspectRatio}px`, // ~67px for 0.72 ratio
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title || '표지'}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
          <BookOpenIcon className="h-5 w-5 text-indigo-400" />
        </div>
      )}
    </div>
  )
}

// Job card component for all jobs
function JobCard({
  job,
  onDownload,
  onCancel,
  onDelete,
}: {
  job: PublishJobWithDiary
  onDownload: (job: PublishJobWithDiary, type: string) => void
  onCancel: (jobId: string) => void
  onDelete: (jobId: string) => void
}) {
  const canCancel = job.status === 'pending' || job.status === 'processing'
  const canDelete = job.status === 'completed' || job.status === 'failed'

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start gap-3">
        <CoverPreview imageUrl={job.diary.cover_image_url} title={job.diary.title} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {job.diary.title || `${job.diary.volume_number}권`}
            </span>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-gray-500 truncate">
            {job.user?.name || job.user?.email || '알 수 없음'}
          </p>
          <p className="text-xs text-gray-400">
            {formatDate(job.created_at)}
            {job.completed_at && ` → ${formatDate(job.completed_at)}`}
          </p>
        </div>
        {/* Cancel/Delete buttons */}
        <div className="flex-shrink-0">
          {canCancel && (
            <button
              onClick={() => onCancel(job.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="작업 취소"
            >
              <StopIcon className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(job.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="작업 삭제"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {job.status === 'completed' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {/* New: ZIP download button */}
          {job.zip_url && (
            <button
              onClick={() => onDownload(job, 'zip')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              전체 다운로드 (ZIP)
            </button>
          )}
          {/* Backward compatibility: individual PDF buttons for old jobs */}
          {!job.zip_url && (
            <>
              {job.front_cover_url && (
                <button
                  onClick={() => onDownload(job, 'front')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-3 w-3" />
                  앞표지
                </button>
              )}
              {job.back_cover_url && (
                <button
                  onClick={() => onDownload(job, 'back')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-3 w-3" />
                  뒷표지
                </button>
              )}
              {job.spine_url && (
                <button
                  onClick={() => onDownload(job, 'spine')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-3 w-3" />
                  책등
                </button>
              )}
              {job.inner_pages_url && (
                <button
                  onClick={() => onDownload(job, 'inner')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-3 w-3" />
                  내지
                </button>
              )}
            </>
          )}
        </div>
      )}

      {job.status === 'failed' && job.error_message && (
        <p className="mt-2 text-xs text-red-600">{job.error_message}</p>
      )}
    </div>
  )
}

export default function AdminPublishingPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()

  // Diaries state
  const [diaries, setDiaries] = useState<PublishableDiary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // Jobs state
  const [jobs, setJobs] = useState<PublishJobWithDiary[]>([])

  // Generating state
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [progressMessage, setProgressMessage] = useState<string>('')

  // Fetch publishable diaries
  const fetchDiaries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/admin/publishing/diaries?${params}`)
      if (!response.ok) throw new Error('Failed to fetch diaries')
      const data = await response.json()

      setDiaries(data.diaries)
      if (data.pagination) {
        setPagination(data.pagination)
      }
    } catch {
      toast.error('일기장 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, statusFilter, toast])

  // Fetch publish jobs
  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/publishing')
      if (!response.ok) throw new Error('Failed to fetch jobs')
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch {
      toast.error('작업 목록을 불러오지 못했습니다.')
    }
  }, [toast])

  useEffect(() => {
    fetchDiaries()
    fetchJobs()
  }, [fetchDiaries, fetchJobs])

  // Auto-refresh jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some((j) => j.status === 'pending' || j.status === 'processing')
    if (!hasActiveJobs) return

    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [jobs, fetchJobs])

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === diaries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(diaries.map((d) => d.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // Generate publishing files (client-side)
  const handleGenerate = async (diaryId: string) => {
    const diary = diaries.find((d) => d.id === diaryId)
    if (!diary) {
      toast.error('일기장을 찾을 수 없습니다.')
      return
    }

    const confirmed = await confirm({
      title: '출판용 파일 생성',
      message: '선택한 일기장의 출판용 PDF 파일을 생성하시겠습니까? 앞표지, 뒷표지, 책등, 내지가 생성됩니다.',
      confirmText: '생성하기',
    })
    if (!confirmed) return

    setGenerating((prev) => new Set(prev).add(diaryId))
    setProgressMessage('준비 중...')

    try {
      const supabase = createClient()

      // Create job record first
      setProgressMessage('작업 생성 중...')
      const jobResponse = await fetch('/api/admin/publishing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diary_id: diaryId }),
      })

      if (!jobResponse.ok) {
        const data = await jobResponse.json()
        throw new Error(data.error || 'Failed to create job')
      }

      const { job } = await jobResponse.json()

      // Fetch diary details with templates
      setProgressMessage('일기장 정보 로딩 중...')
      const { data: diaryData, error: diaryError } = await supabase
        .from('diaries')
        .select(`
          *,
          cover_template:cover_templates(*),
          paper_template:paper_templates(*)
        `)
        .eq('id', diaryId)
        .single()

      if (diaryError || !diaryData) {
        throw new Error('일기장 정보를 불러올 수 없습니다.')
      }

      // Fetch diary entries
      setProgressMessage('일기 항목 로딩 중...')
      const { data: entries, error: entriesError } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('diary_id', diaryId)
        .order('entry_date', { ascending: true })

      if (entriesError) {
        throw new Error('일기 항목을 불러올 수 없습니다.')
      }

      // Use timestamp in path to bust CDN cache
      const timestamp = Date.now()
      const basePath = `${diaryData.user_id}/${diaryId}/${timestamp}`

      // Generate all PDFs
      const frontCoverPdf = await generateFrontCoverPDF(diaryData, setProgressMessage)
      const backCoverPdf = await generateBackCoverPDF(diaryData, setProgressMessage)
      const spinePdf = await generateSpinePDF(diaryData, setProgressMessage)

      let innerPagesPdf: Uint8Array | undefined
      if (entries && entries.length > 0) {
        innerPagesPdf = await generateInnerPagesPDF(diaryData, entries, setProgressMessage)
      }

      // Create ZIP containing all PDFs
      setProgressMessage('ZIP 파일 생성 중...')
      const zipBuffer = await createPublishingZip(
        {
          frontCover: frontCoverPdf,
          backCover: backCoverPdf,
          spine: spinePdf,
          innerPages: innerPagesPdf,
        },
        diaryData.title || '',
        diaryData.volume_number
      )

      // Upload ZIP file
      setProgressMessage('ZIP 파일 업로드 중...')
      const zipUrl = await uploadZipToStorage(zipBuffer, `${basePath}/publishing.zip`)

      // Update job with ZIP URL
      setProgressMessage('작업 완료 처리 중...')
      await fetch(`/api/admin/publishing/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          zip_url: zipUrl,
          page_count: entries?.length || 0,
        }),
      })

      toast.success('출판 파일 생성이 완료되었습니다.')
      fetchJobs()
      fetchDiaries()
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : '생성 실패')
    } finally {
      setGenerating((prev) => {
        const newSet = new Set(prev)
        newSet.delete(diaryId)
        return newSet
      })
      setProgressMessage('')
    }
  }

  // Bulk generate (sequential client-side)
  const handleBulkGenerate = async () => {
    if (selectedIds.size === 0) return

    const confirmed = await confirm({
      title: '일괄 출판 파일 생성',
      message: `선택한 ${selectedIds.size}개 일기장의 출판용 파일을 순차적으로 생성합니다. 시간이 걸릴 수 있습니다.`,
      confirmText: '생성하기',
    })
    if (!confirmed) return

    const idsToProcess = Array.from(selectedIds)
    setSelectedIds(new Set())

    for (let i = 0; i < idsToProcess.length; i++) {
      const id = idsToProcess[i]
      setProgressMessage(`일괄 생성 중... (${i + 1}/${idsToProcess.length})`)
      await handleGenerate(id)
    }

    setProgressMessage('')
    toast.success(`${idsToProcess.length}개 일기장 출판 파일 생성 완료`)
  }

  // Download handler
  const handleDownload = async (job: PublishJobWithDiary, type: string) => {
    let url: string | null = null
    let filename = ''

    switch (type) {
      case 'zip':
        url = job.zip_url
        filename = `${job.diary.title || '일기장'}_${job.diary.volume_number}권_출판파일.zip`
        break
      case 'front':
        url = job.front_cover_url
        filename = `front_cover_${job.diary.volume_number}.pdf`
        break
      case 'back':
        url = job.back_cover_url
        filename = `back_cover_${job.diary.volume_number}.pdf`
        break
      case 'spine':
        url = job.spine_url
        filename = `spine_${job.diary.volume_number}.pdf`
        break
      case 'inner':
        url = job.inner_pages_url
        filename = `inner_pages_${job.diary.volume_number}.pdf`
        break
    }

    if (!url) {
      toast.error('파일을 찾을 수 없습니다.')
      return
    }

    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch {
      toast.error('다운로드 실패')
    }
  }

  // Cancel job handler
  const handleCancelJob = async (jobId: string) => {
    const confirmed = await confirm({
      title: '작업 취소',
      message: '이 작업을 취소하시겠습니까? 진행 중인 작업이 중단됩니다.',
      confirmText: '취소하기',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/publishing/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel job')
      }

      toast.success('작업이 취소되었습니다.')
      fetchJobs()
      fetchDiaries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '취소 실패')
    }
  }

  // Delete job handler
  const handleDeleteJob = async (jobId: string) => {
    const confirmed = await confirm({
      title: '작업 삭제',
      message: '이 작업을 삭제하시겠습니까? 생성된 파일도 함께 삭제됩니다.',
      confirmText: '삭제하기',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/admin/publishing/${jobId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete job')
      }

      toast.success('작업이 삭제되었습니다.')
      fetchJobs()
      fetchDiaries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제 실패')
    }
  }

  const isAllSelected = diaries.length > 0 && selectedIds.size === diaries.length
  const isSomeSelected = selectedIds.size > 0

  // Separate jobs by status
  const activeJobs = jobs.filter((j) => j.status === 'pending' || j.status === 'processing')
  const completedJobs = jobs.filter((j) => j.status === 'completed')
  const failedJobs = jobs.filter((j) => j.status === 'failed')

  return (
    <div className="space-y-6">
      {/* Header with print specs info */}
      <div className="bg-indigo-50 rounded-lg p-4">
        <h2 className="font-semibold text-indigo-900 mb-2">출판용 파일 생성</h2>
        <p className="text-sm text-indigo-700">
          일기장을 책으로 제본하기 위한 인쇄용 PDF 파일을 생성합니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-indigo-600">
          <span>표지 크기: {PRINT_SPECS.COVER_WIDTH_MM}×{PRINT_SPECS.COVER_HEIGHT_MM}mm</span>
          <span>책등 폭: {PRINT_SPECS.SPINE_WIDTH_MM}mm</span>
          <span>재단 여백: {PRINT_SPECS.BLEED_MM}mm</span>
          <span>해상도: {PRINT_SPECS.DPI} DPI</span>
        </div>
      </div>

      {/* Progress indicator */}
      {generating.size > 0 && progressMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900">PDF 생성 중</p>
            <p className="text-sm text-blue-700">{progressMessage}</p>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setPagination((prev) => ({ ...prev, page: 1 }))
          }}
          className="flex-1"
        >
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="사용자 이메일 또는 일기장 이름으로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPagination((prev) => ({ ...prev, page: 1 }))
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">모든 상태</option>
          <option value="completed">완료됨</option>
          <option value="active">작성중</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {isSomeSelected && (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size}개 선택
          </span>
          <button
            onClick={handleBulkGenerate}
            disabled={generating.size > 0}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating.size > 0 ? '생성 중...' : '일괄 생성'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Diaries Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">일기장 목록</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : diaries.length === 0 ? (
          <div className="p-6 text-center text-gray-500">일기장이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    표지
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    사용자
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    권수
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    기간
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    일기수
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {diaries.map((diary) => (
                  <tr
                    key={diary.id}
                    className={`hover:bg-gray-50 ${selectedIds.has(diary.id) ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(diary.id)}
                        onChange={() => toggleSelect(diary.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <CoverPreview imageUrl={diary.cover_image_url} title={diary.title} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <span className="font-medium text-gray-900">
                        {diary.user?.name || '이름 없음'}
                      </span>
                      <span className="text-gray-400 ml-1 text-xs">
                        ({diary.user?.email})
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-900">
                      {diary.volume_number}권
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-500">
                      {formatDateRange(diary.start_date, diary.end_date)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-900">
                      {diary.entry_count}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      {diary.existing_job ? (
                        <StatusBadge status={diary.existing_job.status} />
                      ) : (
                        <span className="text-xs text-gray-400">미생성</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleGenerate(diary.id)}
                        disabled={generating.has(diary.id) || diary.existing_job?.status === 'processing'}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generating.has(diary.id) ? '생성 중...' : diary.existing_job ? '재생성' : '생성'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            전체 <span className="font-medium text-gray-900">{pagination.total}</span>개
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">{pagination.page}</span> /{' '}
              {pagination.totalPages || 1} 페이지
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                이전
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />
            <h3 className="font-medium text-gray-900">진행 중인 작업</h3>
          </div>
          <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onDownload={handleDownload}
                onCancel={handleCancelJob}
                onDelete={handleDeleteJob}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            <h3 className="font-medium text-gray-900">완료된 작업</h3>
          </div>
          <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completedJobs.slice(0, 9).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onDownload={handleDownload}
                onCancel={handleCancelJob}
                onDelete={handleDeleteJob}
              />
            ))}
          </div>
          {completedJobs.length > 9 && (
            <div className="px-4 pb-4 text-center">
              <span className="text-sm text-gray-500">
                +{completedJobs.length - 9}개 더 있음
              </span>
            </div>
          )}
        </div>
      )}

      {/* Failed Jobs */}
      {failedJobs.length > 0 && (
        <div className="rounded-xl bg-white shadow-sm border border-red-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-red-100 flex items-center gap-2">
            <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
            <h3 className="font-medium text-gray-900">실패한 작업</h3>
          </div>
          <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {failedJobs.slice(0, 6).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onDownload={handleDownload}
                onCancel={handleCancelJob}
                onDelete={handleDeleteJob}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
