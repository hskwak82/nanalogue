'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PointsResponse } from '@/types/points'

export function PointsWidget() {
  const [points, setPoints] = useState<PointsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPoints() {
      try {
        const response = await fetch('/api/points')
        if (response.ok) {
          const data = await response.json()
          setPoints(data)
        }
      } catch (error) {
        console.error('Failed to fetch points:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPoints()
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    )
  }

  if (!points) {
    return null
  }

  // Format number with commas
  const formatNumber = (num: number) => num.toLocaleString('ko-KR')

  // Get streak message
  const getStreakMessage = () => {
    if (points.current_streak === 0) {
      return '오늘 일기를 작성해보세요!'
    }
    if (points.next_streak_bonus) {
      return `${points.next_streak_bonus.milestone}일 달성까지 ${points.next_streak_bonus.days_until}일! (+${formatNumber(points.next_streak_bonus.bonus_amount)}P)`
    }
    return `최장 연속 기록: ${points.longest_streak}일`
  }

  return (
    <Link
      href="/settings/points"
      className="block rounded-2xl bg-gradient-to-br from-pastel-purple-light/50 to-pastel-pink-light/50 backdrop-blur-sm p-6 shadow-sm border border-pastel-purple/30 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
          <span className="text-lg">🎁</span>
          내 포인트
        </h2>
        <span className="text-xs text-gray-400">1P = 1원</span>
      </div>

      <div className="text-2xl font-bold text-pastel-purple-dark mb-3">
        {formatNumber(points.balance)} P
      </div>

      {points.current_streak > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
          <span className="text-base">🔥</span>
          <span className="font-medium">{points.current_streak}일 연속 기록 중!</span>
        </div>
      )}

      <div className="text-xs text-gray-500">
        {getStreakMessage()}
      </div>
    </Link>
  )
}
