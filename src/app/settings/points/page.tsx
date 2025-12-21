'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { PointsResponse, PointTransaction, PointTransactionType } from '@/types/points'
import { getReasonLabel, getTypeLabel } from '@/types/points'

type FilterType = 'all' | 'earn' | 'spend' | 'bonus' | 'admin'

export default function PointsPage() {
  const [points, setPoints] = useState<PointsResponse | null>(null)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchTransactions = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
      })

      if (filterType !== 'all') {
        params.set('type', filterType)
      }
      if (startDate) {
        params.set('startDate', startDate)
      }
      if (endDate) {
        params.set('endDate', endDate)
      }

      const res = await fetch(`/api/points/history?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (append) {
          setTransactions(prev => [...prev, ...data.transactions])
        } else {
          setTransactions(data.transactions)
        }
        setTotalPages(data.totalPages)
        setTotal(data.total)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [filterType, startDate, endDate])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const pointsRes = await fetch('/api/points')
        if (pointsRes.ok) {
          const data = await pointsRes.json()
          setPoints(data)
        }
        await fetchTransactions(1)
      } catch (error) {
        console.error('Failed to fetch points data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [fetchTransactions])

  // Reset and refetch when filters change
  const handleFilterChange = () => {
    setPage(1)
    fetchTransactions(1)
  }

  const handleResetFilters = () => {
    setFilterType('all')
    setStartDate('')
    setEndDate('')
    setPage(1)
    // Fetch will be triggered by useEffect
  }

  const formatNumber = (num: number) => num.toLocaleString('ko-KR')

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  }

  const getTypeColor = (type: PointTransactionType) => {
    switch (type) {
      case 'earn':
        return 'bg-green-100 text-green-700'
      case 'bonus':
        return 'bg-purple-100 text-purple-700'
      case 'spend':
        return 'bg-red-100 text-red-700'
      case 'admin':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/30 to-pastel-cream p-6">
        <div className="max-w-2xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pastel-cream via-pastel-pink-light/30 to-pastel-cream">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">내 포인트</h1>
        </div>

        {/* Points Summary */}
        {points && (
          <div className="bg-gradient-to-br from-pastel-purple-light/50 to-pastel-pink-light/50 rounded-2xl p-6 shadow-sm border border-pastel-purple/30">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-2">현재 잔액</p>
              <p className="text-4xl font-bold text-pastel-purple-dark">
                {formatNumber(points.balance)} P
              </p>
              <p className="text-xs text-gray-500 mt-1">1P = 1원</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">총 적립</p>
                <p className="text-lg font-semibold text-green-600">
                  +{formatNumber(points.total_earned)} P
                </p>
              </div>
              <div className="bg-white/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">총 사용</p>
                <p className="text-lg font-semibold text-red-500">
                  -{formatNumber(points.total_spent)} P
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Streak Info */}
        {points && (
          <div className="bg-white/70 rounded-2xl p-6 shadow-sm border border-pastel-pink/30">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span>🔥</span> 연속 기록
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-pastel-purple-dark">
                  {points.current_streak}일
                </p>
                <p className="text-sm text-gray-500">현재 연속</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-400">
                  {points.longest_streak}일
                </p>
                <p className="text-sm text-gray-500">최장 기록</p>
              </div>
            </div>

            {points.next_streak_bonus && (
              <div className="mt-4 p-3 bg-pastel-purple-light/30 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{points.next_streak_bonus.milestone}일</span> 달성까지{' '}
                  <span className="font-semibold text-pastel-purple-dark">
                    {points.next_streak_bonus.days_until}일
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  달성 시 +{formatNumber(points.next_streak_bonus.bonus_amount)}P 보너스!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-white/70 rounded-2xl p-6 shadow-sm border border-pastel-pink/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">포인트 내역</h2>
            <span className="text-sm text-gray-500">총 {formatNumber(total)}건</span>
          </div>

          {/* Filters */}
          <div className="mb-4 space-y-3">
            {/* Type Filter */}
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'earn', 'bonus', 'spend', 'admin'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type)
                    setTimeout(handleFilterChange, 0)
                  }}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    filterType === type
                      ? 'bg-pastel-purple text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'all' ? '전체' : getTypeLabel(type)}
                </button>
              ))}
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pastel-purple/50"
              />
              <span className="text-gray-400 text-xs">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pastel-purple/50"
              />
              <button
                onClick={handleFilterChange}
                className="px-3 py-1.5 text-xs bg-pastel-purple text-white rounded-lg hover:bg-pastel-purple-dark transition-colors whitespace-nowrap"
              >
                검색
              </button>
            </div>
            {(filterType !== 'all' || startDate || endDate) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                필터 초기화
              </button>
            )}
          </div>

          {/* Transaction List */}
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">포인트 내역이 없습니다.</p>
              {(filterType !== 'all' || startDate || endDate) && (
                <p className="text-sm text-gray-400 mt-1">필터를 변경해보세요.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-white/50 rounded-xl border border-gray-100 hover:border-pastel-purple/30 transition-colors"
                >
                  {/* 첫째 줄: 타입 + 제목 + 금액 */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap ${getTypeColor(tx.type)}`}>
                        {getTypeLabel(tx.type)}
                      </span>
                      <p className="font-medium text-sm text-gray-700 truncate">{getReasonLabel(tx.reason)}</p>
                    </div>
                    <p
                      className={`font-bold text-base whitespace-nowrap ${
                        tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {formatNumber(tx.amount)}
                      <span className="text-xs ml-0.5">P</span>
                    </p>
                  </div>
                  {/* 둘째 줄: 날짜 + 잔액 */}
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>{formatDateTime(tx.created_at)}</span>
                    <span>잔액 {formatNumber(tx.balance_after)}P</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-6">
              <button
                onClick={() => fetchTransactions(page - 1)}
                disabled={page <= 1}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchTransactions(pageNum)}
                      className={`w-7 h-7 text-xs rounded-lg transition-colors ${
                        page === pageNum
                          ? 'bg-pastel-purple text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => fetchTransactions(page + 1)}
                disabled={page >= totalPages}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          )}

          {/* Page Info */}
          {total > 0 && (
            <p className="text-center text-[11px] text-gray-400 mt-3">
              {page} / {totalPages} 페이지
            </p>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50/70 rounded-xl p-3 text-xs text-blue-700">
          <p className="font-medium mb-1.5">포인트 안내</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-600 text-[11px]">
            <li>일기 작성 시 자동으로 포인트가 적립됩니다</li>
            <li>연속 기록 달성 시 추가 보너스가 지급됩니다</li>
            <li>적립된 포인트는 구독 결제 시 사용할 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
