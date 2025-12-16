'use client'

import { useEffect, useState, useCallback } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
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
            {user.next_billing_date && (
              <p className="text-sm text-gray-500">
                다음 결제일: {formatDate(user.next_billing_date)}
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

export default function AdminUsersPage() {
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
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

      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, planFilter])

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

      {/* Search and Filter */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    플랜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    구독 유형
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    다이어리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    일기
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || '이름 없음'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeClass(user.plan)}`}>
                        {user.plan === 'pro' ? '프로' : '무료'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.subscription_type === 'recurring' ? (
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            정기구독
                          </span>
                          {user.next_billing_date && (
                            <p className="text-xs text-gray-400 mt-1">
                              다음 결제: {formatDate(user.next_billing_date)}
                            </p>
                          )}
                        </div>
                      ) : user.subscription_type === 'manual' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          수동부여
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.diary_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.entry_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              총 {pagination.total}명 중 {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}명
            </p>
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
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
