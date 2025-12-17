'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/admin'
import { MonthlyUserChart } from '@/components/admin/MonthlyUserChart'
import { MonthlyRevenueChart } from '@/components/admin/MonthlyRevenueChart'
import {
  UsersIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'
import type { AdminStats } from '@/app/api/admin/stats/route'
import type { MonthlyStatsResponse } from '@/app/api/admin/stats/monthly/route'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return '방금 전'
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR')
}

type PeriodFilter = '3' | '6' | '12' | 'year' | 'custom'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('6')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats')
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    async function fetchMonthlyStats() {
      // Skip fetch if custom mode but dates not set
      if (periodFilter === 'custom' && (!customStartDate || !customEndDate)) {
        return
      }

      setMonthlyLoading(true)
      try {
        let url: string

        if (periodFilter === 'custom') {
          url = `/api/admin/stats/monthly?startDate=${customStartDate}&endDate=${customEndDate}`
        } else {
          let months: number
          if (periodFilter === 'year') {
            months = new Date().getMonth() + 1
          } else {
            months = parseInt(periodFilter, 10)
          }
          url = `/api/admin/stats/monthly?months=${months}`
        }

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error('Failed to fetch monthly stats')
        }
        const data = await response.json()
        setMonthlyStats(data)
      } catch (err) {
        console.error('Error fetching monthly stats:', err)
      } finally {
        setMonthlyLoading(false)
      }
    }

    fetchMonthlyStats()
  }, [periodFilter, customStartDate, customEndDate])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        통계를 불러오는데 실패했습니다: {error}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="총 사용자"
          value={stats.users.total.toLocaleString()}
          subtitle={`오늘 +${stats.users.today}`}
          icon={<UsersIcon className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          title="활성 구독자"
          value={stats.subscriptions.active.toLocaleString()}
          subtitle={`무료 ${stats.subscriptions.free}명`}
          icon={<CreditCardIcon className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="이번 달 매출"
          value={formatCurrency(stats.revenue.thisMonth)}
          subtitle={`총 ${formatCurrency(stats.revenue.total)}`}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="총 다이어리"
          value={stats.activity.totalDiaries.toLocaleString()}
          subtitle={`일기 ${stats.activity.totalEntries.toLocaleString()}개`}
          icon={<BookOpenIcon className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">최근 가입자</h3>
          {stats.recentUsers.length === 0 ? (
            <p className="text-sm text-gray-500">최근 가입자가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name || '이름 없음'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {formatDate(user.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">최근 결제</h3>
          {stats.recentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">최근 결제가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentPayments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{payment.user_email}</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-2">
                    {formatDate(payment.paid_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Period Stats */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">기간별 통계</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">오늘 가입</p>
            <p className="text-lg font-bold text-gray-900">{stats.users.today}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">이번 주 가입</p>
            <p className="text-lg font-bold text-gray-900">{stats.users.thisWeek}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">오늘 매출</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.revenue.today)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">이번 주 매출</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.revenue.thisWeek)}</p>
          </div>
        </div>
      </div>

      {/* Monthly Charts Section */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900">월별 통계 그래프</h3>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: '3' as PeriodFilter, label: '3개월' },
              { value: '6' as PeriodFilter, label: '6개월' },
              { value: '12' as PeriodFilter, label: '12개월' },
              { value: 'year' as PeriodFilter, label: '올해' },
              { value: 'custom' as PeriodFilter, label: '검색' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriodFilter(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  periodFilter === option.value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {periodFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <label htmlFor="startDate" className="text-xs font-medium text-gray-600">
                시작
              </label>
              <input
                type="month"
                id="startDate"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <span className="text-gray-400">~</span>
            <div className="flex items-center gap-2">
              <label htmlFor="endDate" className="text-xs font-medium text-gray-600">
                종료
              </label>
              <input
                type="month"
                id="endDate"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {monthlyLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : monthlyStats ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Users Chart */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-3">월별 가입자 현황</h4>
              <MonthlyUserChart data={monthlyStats.monthlyUsers} />
            </div>

            {/* Monthly Revenue Chart */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-3">월별 매출 현황</h4>
              <MonthlyRevenueChart data={monthlyStats.monthlyRevenue} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            월별 통계를 불러올 수 없습니다.
          </p>
        )}
      </div>
    </div>
  )
}
