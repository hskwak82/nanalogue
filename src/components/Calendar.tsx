'use client'

import { useState, useMemo } from 'react'

interface DiaryEntry {
  entry_date: string
  status?: string
}

interface CalendarProps {
  entries: DiaryEntry[]
  onDateSelect?: (date: string) => void
  googleEvents?: { date: string; title: string }[]
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function Calendar({ entries, onDateSelect, googleEvents = [] }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get diary entry dates as a Set for quick lookup
  const entryDates = useMemo(() => {
    return new Set(entries.map((e) => e.entry_date))
  }, [entries])

  // Get Google event dates as a Set
  const googleEventDates = useMemo(() => {
    return new Set(googleEvents.map((e) => e.date))
  }, [googleEvents])

  // Get calendar grid data
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = firstDay.getDay() // 0 = Sunday
    const daysInMonth = lastDay.getDate()

    const days: (number | null)[] = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    // Fill remaining cells to complete the grid (6 rows x 7 days = 42)
    while (days.length < 42) {
      days.push(null)
    }

    return days
  }, [year, month])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const formatDateString = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const today = new Date()
  const isToday = (day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  const handleDateClick = (day: number | null) => {
    if (!day || !onDateSelect) return
    const dateStr = formatDateString(day)
    onDateSelect(dateStr)
  }

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-4 shadow-sm border border-pastel-pink/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-full hover:bg-pastel-pink-light transition-colors text-gray-500 hover:text-pastel-purple-dark"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-700">
          {year}년 {month + 1}월
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-full hover:bg-pastel-pink-light transition-colors text-gray-500 hover:text-pastel-purple-dark"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const dateStr = formatDateString(day)
          const hasDiary = entryDates.has(dateStr)
          const hasGoogleEvent = googleEventDates.has(dateStr)
          const isTodayDate = isToday(day)
          const dayOfWeek = (index % 7)

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg text-sm
                transition-all relative
                ${isTodayDate ? 'ring-2 ring-pastel-purple font-bold' : ''}
                ${hasDiary ? 'bg-pastel-mint-light text-gray-700 hover:bg-pastel-mint' : 'hover:bg-pastel-pink-light'}
                ${dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-600'}
                ${!hasDiary && !isTodayDate ? 'hover:text-pastel-purple-dark' : ''}
              `}
            >
              <span>{day}</span>
              {/* Indicators */}
              <div className="flex gap-0.5 mt-0.5">
                {hasDiary && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pastel-purple" />
                )}
                {hasGoogleEvent && !hasDiary && (
                  <span className="w-1.5 h-1.5 rounded-full bg-pastel-peach" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-pastel-purple" />
          <span>일기 작성</span>
        </div>
        {googleEvents.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-pastel-peach" />
            <span>캘린더 일정</span>
          </div>
        )}
      </div>
    </div>
  )
}
