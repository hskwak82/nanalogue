'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PointsResponse, PointTransaction } from '@/types/points'
import { getReasonLabel } from '@/types/points'

export default function PointsPage() {
  const [points, setPoints] = useState<PointsResponse | null>(null)
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchData() {
      try {
        const [pointsRes, historyRes] = await Promise.all([
          fetch('/api/points'),
          fetch('/api/points/history?limit=20'),
        ])

        if (pointsRes.ok) {
          const data = await pointsRes.json()
          setPoints(data)
        }

        if (historyRes.ok) {
          const data = await historyRes.json()
          setTransactions(data.transactions)
          setHasMore(data.hasMore)
        }
      } catch (error) {
        console.error('Failed to fetch points data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    try {
      const res = await fetch(`/api/points/history?limit=20&offset=${page * 20}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(prev => [...prev, ...data.transactions])
        setHasMore(data.hasMore)
        setPage(prev => prev + 1)
      }
    } catch (error) {
      console.error('Failed to load more transactions:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const formatNumber = (num: number) => num.toLocaleString('ko-KR')
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
          <h2 className="text-lg font-semibold text-gray-700 mb-4">포인트 내역</h2>

          {transactions.length === 0 ? (
            <p className="text-center text-gray-400 py-8">아직 포인트 내역이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-700">{getReasonLabel(tx.reason)}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                  </div>
                  <p
                    className={`font-semibold ${
                      tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {formatNumber(tx.amount)} P
                  </p>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {loadingMore ? '로딩 중...' : '더 보기'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">포인트 안내</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600 text-xs">
            <li>일기 작성 시 자동으로 포인트가 적립됩니다</li>
            <li>연속 기록 달성 시 추가 보너스가 지급됩니다</li>
            <li>적립된 포인트는 구독 결제 시 사용할 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
