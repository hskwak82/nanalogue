'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface CalendarSettingsProps {
  isConnected: boolean
}

export function CalendarSettings({ isConnected: initialConnected }: CalendarSettingsProps) {
  const [isConnected, setIsConnected] = useState(initialConnected)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const calendarStatus = searchParams.get('calendar')
    const errorMessage = searchParams.get('message')

    if (calendarStatus === 'connected') {
      setMessage({ type: 'success', text: 'Google Calendar가 연동되었습니다!' })
      setIsConnected(true)
      // Clear URL params
      window.history.replaceState({}, '', '/settings')
    } else if (calendarStatus === 'error') {
      const errorText = errorMessage === 'no_code'
        ? '인증 코드를 받지 못했습니다.'
        : errorMessage === 'save_failed'
          ? '토큰 저장에 실패했습니다.'
          : errorMessage === 'exchange_failed'
            ? '인증 토큰 교환에 실패했습니다.'
            : '연동 중 오류가 발생했습니다.'
      setMessage({ type: 'error', text: errorText })
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams])

  const handleConnect = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/calendar/connect')
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: '연동 URL을 가져오는데 실패했습니다.' })
        setLoading(false)
      }
    } catch {
      setMessage({ type: 'error', text: '연동 중 오류가 발생했습니다.' })
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        setIsConnected(false)
        setMessage({ type: 'success', text: 'Google Calendar 연동이 해제되었습니다.' })
      } else {
        setMessage({ type: 'error', text: '연동 해제에 실패했습니다.' })
      }
    } catch {
      setMessage({ type: 'error', text: '연동 해제 중 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-500">
        Google Calendar와 연동하여 일정을 확인하고, 일기를 쓴 날에 캘린더 이벤트를 생성합니다.
      </p>

      {message && (
        <div
          className={`rounded-xl p-3 text-sm ${
            message.type === 'success'
              ? 'bg-pastel-mint-light text-gray-700'
              : 'bg-pastel-peach-light text-gray-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-pastel-mint">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Google Calendar 연동됨</span>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="rounded-full border border-pastel-peach bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-pastel-peach-light transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '처리 중...' : '연동 해제'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-white border border-pastel-pink px-4 py-2 text-sm font-medium text-gray-700 hover:bg-pastel-pink-light transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            '연결 중...'
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google Calendar 연동
            </>
          )}
        </button>
      )}
    </div>
  )
}
