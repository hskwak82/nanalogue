'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { useToast, useConfirm } from '@/components/ui'
import type { AdminUser } from '@/app/api/admin/users/route'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface SubscriptionModalProps {
  user: AdminUser | null
  onClose: () => void
  onSuccess: () => void
  toast: {
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
  }
  confirm: (options: { title: string; message: string; confirmText?: string; variant?: 'danger' | 'warning' | 'default' }) => Promise<boolean>
}

function SubscriptionModal({ user, onClose, onSuccess, toast, confirm }: SubscriptionModalProps) {
  const [plan, setPlan] = useState('pro')
  const [durationDays, setDurationDays] = useState(30)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const handleGrant = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          plan,
          durationDays,
          reason,
        }),
      })
      if (!response.ok) throw new Error('Failed to grant')
      const data = await response.json()
      toast.success(data.message || '구독이 부여되었습니다.')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('구독 부여 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    const confirmed = await confirm({
      title: '구독 취소',
      message: '정말 구독을 취소하시겠습니까?',
      confirmText: '취소하기',
      variant: 'danger',
    })
    if (!confirmed) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/subscriptions?userId=${user.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to revoke')
      toast.success('구독이 취소되었습니다.')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('구독 취소 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">구독 관리</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* User Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{user.name || '이름 없음'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-500 mt-1">
              현재 플랜: <span className={user.plan === 'pro' ? 'text-indigo-600 font-medium' : ''}>{user.plan === 'pro' ? '프로' : '무료'}</span>
              {user.subscription_type === 'recurring' && <span className="ml-2 text-green-600">(정기구독)</span>}
              {user.subscription_type === 'manual' && <span className="ml-2 text-amber-600">(수동부여)</span>}
            </p>
            {user.subscription_type === 'recurring' && user.next_billing_date && (
              <p className="text-sm text-gray-500">
                다음 결제일: {formatDate(user.next_billing_date)}
              </p>
            )}
            {user.subscription_type === 'manual' && user.current_period_end && (
              <p className="text-sm text-gray-500">
                만료일: {formatDate(user.current_period_end)}
              </p>
            )}
          </div>

          {/* Grant Subscription */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">구독 부여</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">플랜</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="pro">프로</option>
                  <option value="free">무료</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">기간 (일)</label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value={7}>7일</option>
                  <option value={30}>30일</option>
                  <option value={90}>90일</option>
                  <option value={180}>180일</option>
                  <option value={365}>365일</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">사유 (선택)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 테스터 계정, 이벤트 당첨"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <button
              onClick={handleGrant}
              disabled={saving}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? '처리 중...' : '구독 부여'}
            </button>
          </div>

          {/* Revoke Subscription */}
          {user.plan === 'pro' && (
            <div className="pt-3 border-t">
              <button
                onClick={handleRevoke}
                disabled={saving}
                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                구독 취소 (무료로 변경)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Bulk Subscription Modal
interface BulkSubscriptionModalProps {
  userIds: string[]
  onClose: () => void
  onSuccess: () => void
  toast: {
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
  }
}

function BulkSubscriptionModal({ userIds, onClose, onSuccess, toast }: BulkSubscriptionModalProps) {
  const [plan, setPlan] = useState('pro')
  const [durationDays, setDurationDays] = useState(30)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleBulkGrant = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/subscriptions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds,
          plan,
          durationDays,
          reason,
        }),
      })
      if (!response.ok) throw new Error('Failed to grant')
      const data = await response.json()
      toast.success(data.message || `${userIds.length}명에게 구독이 부여되었습니다.`)
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('일괄 구독 부여 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">일괄 구독 부여</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-700">
              <span className="font-medium">{userIds.length}명</span>의 사용자에게 구독을 부여합니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">플랜</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="pro">프로</option>
                <option value="free">무료</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">기간 (일)</label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value={7}>7일</option>
                <option value={30}>30일</option>
                <option value={90}>90일</option>
                <option value={180}>180일</option>
                <option value={365}>365일</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">사유 (선택)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 테스터 계정, 이벤트 당첨"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>

          <button
            onClick={handleBulkGrant}
            disabled={saving}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? '처리 중...' : `${userIds.length}명에게 구독 부여`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [subscriptionTypeFilter, setSubscriptionTypeFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search) params.set('search', search)
      if (planFilter) params.set('plan', planFilter)
      if (subscriptionTypeFilter) params.set('subscriptionType', subscriptionTypeFilter)
      if (periodFilter) params.set('period', periodFilter)

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
      setSelectedIds(new Set()) // Clear selection on page change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, planFilter, subscriptionTypeFilter, periodFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-indigo-100 text-indigo-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map(u => u.id)))
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

  // Bulk actions
  const handleBulkRevoke = async () => {
    const confirmed = await confirm({
      title: '일괄 구독 취소',
      message: `선택한 ${selectedIds.size}명의 구독을 취소하시겠습니까?`,
      confirmText: '취소하기',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/subscriptions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedIds) }),
      })
      if (!response.ok) throw new Error('Failed to revoke')
      toast.success(`${selectedIds.size}명의 구독이 취소되었습니다.`)
      setSelectedIds(new Set())
      fetchUsers()
    } catch (error) {
      toast.error('일괄 구독 취소 실패')
    }
  }

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: '사용자 삭제',
      message: `선택한 ${selectedIds.size}명의 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제하기',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedIds) }),
      })
      if (!response.ok) throw new Error('Failed to delete')
      toast.success(`${selectedIds.size}명의 사용자가 삭제되었습니다.`)
      setSelectedIds(new Set())
      fetchUsers()
    } catch (error) {
      toast.error('사용자 삭제 실패')
    }
  }

  // Excel functions
  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedIds.size > 0) {
        params.set('userIds', Array.from(selectedIds).join(','))
      }
      const response = await fetch(`/api/admin/users/export?${params}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `나날로그_사용자목록_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      const msg = selectedIds.size > 0
        ? `${selectedIds.size}명의 사용자가 다운로드되었습니다.`
        : '전체 사용자 목록이 다운로드되었습니다.'
      toast.success(msg)
    } catch (error) {
      toast.error('내보내기 실패')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/users/template')
      if (!response.ok) throw new Error('Template download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '나날로그_사용자등록_양식.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('등록 양식이 다운로드되었습니다.')
    } catch (error) {
      toast.error('양식 다운로드 실패')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/users/import', {
        method: 'POST',
        body: formData,
      })

      const contentType = response.headers.get('content-type')

      // Check if response is Excel file (failed rows)
      if (contentType?.includes('spreadsheetml')) {
        const successCount = response.headers.get('X-Import-Success') || '0'
        const failedCount = response.headers.get('X-Import-Failed') || '0'

        // Download the failed rows Excel file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = '나날로그_등록실패_목록.xlsx'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast.success(`${successCount}명 등록 완료, ${failedCount}명 실패 (실패 목록 다운로드됨)`)
        fetchUsers()
        return
      }

      // JSON response (all succeeded or error)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      toast.success(data.message)
      fetchUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '일괄 등록 실패')
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const isAllSelected = users.length > 0 && selectedIds.size === users.length
  const isSomeSelected = selectedIds.size > 0

  return (
    <div className="space-y-6">
      {/* Subscription Modal */}
      {selectedUser && (
        <SubscriptionModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuccess={fetchUsers}
          toast={toast}
          confirm={confirm}
        />
      )}

      {/* Bulk Subscription Modal */}
      {showBulkModal && (
        <BulkSubscriptionModal
          userIds={Array.from(selectedIds)}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setSelectedIds(new Set())
            fetchUsers()
          }}
          toast={toast}
        />
      )}

      {/* Search and Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이메일 또는 이름으로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </form>
          <select
            value={pagination.limit}
            onChange={(e) => {
              setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value={10}>10개씩</option>
            <option value={20}>20개씩</option>
            <option value={50}>50개씩</option>
            <option value={100}>100개씩</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">모든 플랜</option>
            <option value="free">무료</option>
            <option value="pro">프로</option>
          </select>
          <select
            value={subscriptionTypeFilter}
            onChange={(e) => {
              setSubscriptionTypeFilter(e.target.value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">모든 구독유형</option>
            <option value="recurring">정기구독</option>
            <option value="manual">수동부여</option>
            <option value="none">구독없음</option>
          </select>
          <select
            value={periodFilter}
            onChange={(e) => {
              setPeriodFilter(e.target.value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">전체 가입기간</option>
            <option value="today">오늘 가입</option>
            <option value="week">최근 1주</option>
            <option value="month">이번 달</option>
            <option value="3months">최근 3개월</option>
          </select>
        </div>
      </div>

      {/* Tools Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Excel Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {selectedIds.size > 0 ? `내보내기 (${selectedIds.size}명)` : '내보내기'}
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            등록 양식
          </button>
          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <ArrowUpTrayIcon className="h-4 w-4" />
            {importing ? '등록 중...' : '일괄 등록'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>

        {/* Right: Bulk Actions (when selected) */}
        {isSomeSelected && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-indigo-700">
              {selectedIds.size}명 선택
            </span>
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              구독 부여
            </button>
            <button
              onClick={handleBulkRevoke}
              className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              구독 취소
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1"
            >
              <TrashIcon className="h-4 w-4" />
              삭제
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-red-600">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-gray-500">사용자가 없습니다.</div>
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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    플랜
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    구독 유형
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    만료일
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    다이어리
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    일기
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 ${selectedIds.has(user.id) ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <span className="font-medium text-gray-900">{user.name || '이름 없음'}</span>
                      <span className="text-gray-400 ml-1">({user.email})</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeClass(user.plan)}`}>
                        {user.plan === 'pro' ? '프로' : '무료'}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      {user.subscription_type === 'recurring' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          정기구독
                        </span>
                      ) : user.subscription_type === 'manual' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          수동부여
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                      {user.subscription_type === 'recurring' ? (
                        <span className="text-green-600 font-medium">정기구독</span>
                      ) : user.current_period_end ? (
                        <span className="text-gray-900">{formatDate(user.current_period_end)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                      {user.diary_count}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                      {user.entry_count}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        구독 관리
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
            {pagination.total > 0 && (
              <span className="ml-2">
                ({(pagination.page - 1) * pagination.limit + 1} ~ {Math.min(pagination.page * pagination.limit, pagination.total)})
              </span>
            )}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">{pagination.page}</span> / {pagination.totalPages || 1} 페이지
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
    </div>
  )
}
