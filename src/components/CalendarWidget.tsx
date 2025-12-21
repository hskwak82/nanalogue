'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from './Calendar'
import { AddScheduleModal } from './AddScheduleModal'
import { Toast } from './Toast'

interface DiaryEntry {
  entry_date: string
  status?: string
}

interface GoogleEvent {
  date: string
  title: string
  time?: string      // HH:mm for timed events (start time)
  endTime?: string   // HH:mm for timed events (end time)
  isAllDay: boolean
}

interface CalendarWidgetProps {
  entries: DiaryEntry[]
  isConnected: boolean
  googleEvents?: GoogleEvent[]
  onConnect?: () => void
}

export function CalendarWidget({
  entries,
  isConnected: initialIsConnected,
  googleEvents: initialGoogleEvents = [],
  onConnect,
}: CalendarWidgetProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // Track connection status (can change if token expires)
  const [isConnected, setIsConnected] = useState(initialIsConnected)
  const [needsReconnection, setNeedsReconnection] = useState(false)

  // Cache for events by month (key: "YYYY-MM") - persisted to sessionStorage
  const [eventsCache, setEventsCache] = useState<Record<string, GoogleEvent[]>>(() => {
    // Initialize with server-provided events only (no sessionStorage access during SSR)
    if (initialGoogleEvents.length > 0) {
      const now = new Date()
      const key = `${now.getFullYear()}-${now.getMonth()}`
      return { [key]: initialGoogleEvents }
    }
    return {}
  })
  const [isLoading, setIsLoading] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  // Load cache from sessionStorage after mount (client-side only)
  useEffect(() => {
    const cached = sessionStorage.getItem('calendar-events-cache')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Object.keys(parsed).length > 0) {
          setEventsCache(parsed)
        }
      } catch {}
    }
    setHasMounted(true)
  }, [])

  // Persist cache to sessionStorage
  useEffect(() => {
    if (hasMounted && Object.keys(eventsCache).length > 0) {
      sessionStorage.setItem('calendar-events-cache', JSON.stringify(eventsCache))
    }
  }, [eventsCache, hasMounted])
  const [showAddModal, setShowAddModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Handle calendar connection
  const handleConnect = async () => {
    if (onConnect) {
      onConnect()
      return
    }

    // Default behavior: call API and redirect
    setIsConnecting(true)
    try {
      const response = await fetch('/api/calendar/connect')
      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        }
      } else {
        setToast({ message: '연동 중 오류가 발생했습니다.', type: 'error' })
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error)
      setToast({ message: '연동 중 오류가 발생했습니다.', type: 'error' })
    } finally {
      setIsConnecting(false)
    }
  }

  const getCacheKey = (year: number, month: number) => `${year}-${month}`
  const currentCacheKey = getCacheKey(currentMonth.year, currentMonth.month)
  const googleEvents = eventsCache[currentCacheKey] || []

  // Fetch events for a specific month
  const fetchEventsForMonth = async (year: number, month: number, forceRefresh = false) => {
    if (!isConnected && !needsReconnection) return

    const key = getCacheKey(year, month)

    // Skip if already cached and not forcing refresh
    if (!forceRefresh && eventsCache[key]) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/calendar/events?year=${year}&month=${month}`
      )
      if (response.ok) {
        const data = await response.json()

        // Handle reconnection needed
        if (data.needsReconnection) {
          setNeedsReconnection(true)
          setIsConnected(false)
          // Clear cache when reconnection is needed
          setEventsCache({})
          sessionStorage.removeItem('calendar-events-cache')
          return
        }

        // Update connection status from API response
        if (data.connected !== undefined) {
          setIsConnected(data.connected)
          if (!data.connected) {
            setEventsCache({})
            return
          }
        }

        setEventsCache(prev => ({
          ...prev,
          [key]: data.events || []
        }))
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial connection check - verify token is still valid
  useEffect(() => {
    if (hasMounted && initialIsConnected && !eventsCache[currentCacheKey]) {
      // Force fetch to check if connection is still valid
      fetchEventsForMonth(currentMonth.year, currentMonth.month, true)
    }
  }, [hasMounted, initialIsConnected])

  // Fetch on month change (only if not cached and after mount)
  useEffect(() => {
    if (hasMounted && isConnected) {
      fetchEventsForMonth(currentMonth.year, currentMonth.month)
    }
  }, [currentMonth, isConnected, hasMounted])

  const handleMonthChange = (year: number, month: number) => {
    setCurrentMonth({ year, month })
    setSelectedDate(null)
  }

  // Sync button handler - clears cache and re-fetches current month
  const handleSync = async () => {
    setEventsCache({})
    await fetchEventsForMonth(currentMonth.year, currentMonth.month, true)
  }

  const handleDateSelect = (date: string) => {
    // Toggle selected date to show events
    if (selectedDate === date) {
      // Double click: navigate to diary or session
      const hasEntry = entries.some((e) => e.entry_date === date)
      if (hasEntry) {
        router.push(`/diary/${date}`)
      } else {
        const today = new Date().toISOString().split('T')[0]
        if (date === today) {
          router.push('/session?entry=true')
        }
      }
    } else {
      setSelectedDate(date)
    }
  }

  // Get events for selected date (sorted: all-day first, then by time)
  const selectedDateEvents = selectedDate
    ? googleEvents
        .filter((e) => e.date === selectedDate)
        .sort((a, b) => {
          // All-day events first
          if (a.isAllDay && !b.isAllDay) return -1
          if (!a.isAllDay && b.isAllDay) return 1
          // Then sort by time
          if (a.time && b.time) return a.time.localeCompare(b.time)
          return 0
        })
    : []

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? '오후' : '오전'
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${ampm} ${hour12}:${minutes}`
  }

  // Format time range for display (start - end)
  const formatTimeRange = (startTime?: string, endTime?: string) => {
    if (!startTime) return ''
    const start = formatTime(startTime)
    if (!endTime) return start
    const end = formatTime(endTime)
    return `${start} - ${end}`
  }

  // Get diary entry for selected date
  const selectedDateDiary = selectedDate
    ? entries.find((e) => e.entry_date === selectedDate)
    : null

  // Format selected date for display
  const formatSelectedDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  return (
    <div className="space-y-4">
      <Calendar
        entries={entries}
        onDateSelect={handleDateSelect}
        googleEvents={googleEvents}
        selectedDate={selectedDate}
        onMonthChange={handleMonthChange}
      />

      {/* Connection status - needs reconnection */}
      {needsReconnection && (
        <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
          <div className="flex items-start gap-2 mb-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-700">
              Google Calendar 연결이 만료되었어요. 다시 연동해주세요.
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-amber-100 transition-all border border-amber-300 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isConnecting ? '연동 중...' : '다시 연동하기'}
          </button>
        </div>
      )}

      {/* Connection status - not connected */}
      {!isConnected && !needsReconnection && (
        <div className="rounded-xl bg-pastel-warm p-4 border border-pastel-pink/30">
          <p className="text-sm text-gray-600 mb-3">
            Google Calendar와 연동하면 일정을 함께 볼 수 있어요.
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-pastel-pink-light transition-all border border-pastel-pink disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isConnecting ? '연동 중...' : 'Google Calendar 연동'}
          </button>
        </div>
      )}

      {isConnected && (
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1 text-xs text-pastel-mint">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Google Calendar 연동됨</span>
          </div>
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-pastel-purple transition-colors disabled:opacity-50"
            title="일정 동기화"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>동기화</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-xs text-pastel-purple hover:text-pastel-purple-dark transition-colors"
            title="일정 추가"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>일정 추가</span>
          </button>
        </div>
      )}

      {/* Selected Date Info */}
      {selectedDate && (
        <div className="rounded-xl bg-white/70 backdrop-blur-sm p-4 border border-pastel-pink/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              {formatSelectedDate(selectedDate)}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Diary entry for this date */}
          {selectedDateDiary && (
            <button
              onClick={() => router.push(`/diary/${selectedDate}`)}
              className="w-full flex items-center gap-2 text-sm p-2 rounded-lg bg-pastel-mint-light hover:bg-pastel-mint/30 transition-colors mb-2"
            >
              <span className="w-2 h-2 rounded-full bg-pastel-purple flex-shrink-0" />
              <span className="text-gray-700">나날로그 일기</span>
              <svg className="w-4 h-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Google Calendar events for this date */}
          {selectedDateEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDateEvents.map((event, idx) => (
                <div
                  key={`${event.date}-${idx}`}
                  className="flex items-start gap-2 text-sm p-2 rounded-lg bg-pastel-peach-light/50"
                >
                  <span className="w-2 h-2 rounded-full bg-pastel-peach mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 truncate">{event.title}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {event.isAllDay ? '종일' : formatTimeRange(event.time, event.endTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : !selectedDateDiary ? (
            <p className="text-sm text-gray-400 text-center py-2">일정이 없습니다</p>
          ) : null}

          {/* Quick action for today */}
          {selectedDate === new Date().toISOString().split('T')[0] && !selectedDateDiary && (
            <button
              onClick={() => router.push('/session?entry=true')}
              className="w-full mt-2 text-sm text-pastel-purple hover:text-pastel-purple-dark font-medium"
            >
              오늘 기록 시작하기 →
            </button>
          )}
        </div>
      )}

      {/* Upcoming Google Calendar Events (when no date selected) */}
      {!selectedDate && isConnected && googleEvents.length > 0 && (
        <div className="rounded-xl bg-white/70 backdrop-blur-sm p-4 border border-pastel-pink/30">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">다가오는 일정</h3>
          <div className="space-y-2">
            {googleEvents
              .filter((e) => e.date >= new Date().toISOString().split('T')[0])
              .sort((a, b) => {
                // Sort by date first
                const dateCompare = a.date.localeCompare(b.date)
                if (dateCompare !== 0) return dateCompare
                // Then all-day events first
                if (a.isAllDay && !b.isAllDay) return -1
                if (!a.isAllDay && b.isAllDay) return 1
                // Then by time
                if (a.time && b.time) return a.time.localeCompare(b.time)
                return 0
              })
              .slice(0, 5)
              .map((event, idx) => (
                <div
                  key={`${event.date}-${idx}`}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-pastel-peach mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 truncate">{event.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(event.date + 'T00:00:00').toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                      {' · '}
                      {event.isAllDay ? '종일' : formatTimeRange(event.time, event.endTime)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      <AddScheduleModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onEventAdded={() => {
          handleSync()
          setToast({ message: '일정이 캘린더에 추가되었어요!', type: 'success' })
        }}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
