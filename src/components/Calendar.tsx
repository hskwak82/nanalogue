'use client'

import { useState, useMemo, useRef } from 'react'
import { CalendarThumbnail } from '@/components/calendar/CalendarThumbnail'
import type { ThumbnailCropData } from '@/types/database'

interface DiaryEntry {
  entry_date: string
  status?: string
}

interface SessionImage {
  date: string
  imageUrl: string
  cropData?: ThumbnailCropData | null
}

interface CalendarProps {
  entries: DiaryEntry[]
  onDateSelect?: (date: string) => void
  googleEvents?: { date: string; title: string }[]
  selectedDate?: string | null
  onMonthChange?: (year: number, month: number) => void
  sessionImages?: SessionImage[]
  onImageEdit?: (date: string, imageUrl: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function Calendar({
  entries,
  onDateSelect,
  googleEvents = [],
  selectedDate,
  onMonthChange,
  sessionImages = [],
  onImageEdit,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hoveredImage, setHoveredImage] = useState<{
    imageUrl: string
    date: string
    position: { x: number; y: number }
  } | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

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

  // Get session images as a Map for quick lookup
  const sessionImageMap = useMemo(() => {
    const map = new Map<string, SessionImage>()
    sessionImages.forEach((img) => map.set(img.date, img))
    return map
  }, [sessionImages])

  // Handle image hover
  const handleImageHover = (e: React.MouseEvent, imageUrl: string, date: string) => {
    if (!calendarRef.current) return
    const rect = calendarRef.current.getBoundingClientRect()
    const cellRect = (e.currentTarget as HTMLElement).getBoundingClientRect()

    // Position the preview to the right of the cell, or left if near right edge
    const previewWidth = 192
    const previewHeight = 192
    let x = cellRect.right - rect.left + 8
    let y = cellRect.top - rect.top - previewHeight / 2 + cellRect.height / 2

    // Adjust if would go off right edge
    if (cellRect.right + previewWidth + 16 > window.innerWidth) {
      x = cellRect.left - rect.left - previewWidth - 8
    }

    // Adjust if would go off top or bottom
    if (y < 0) y = 8
    if (y + previewHeight > rect.height) y = rect.height - previewHeight - 8

    setHoveredImage({ imageUrl, date, position: { x, y } })
  }

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
    const newDate = new Date(year, month - 1, 1)
    setCurrentDate(newDate)
    onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
  }

  const goToNextMonth = () => {
    const newDate = new Date(year, month + 1, 1)
    setCurrentDate(newDate)
    onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
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
    <div ref={calendarRef} className="rounded-2xl bg-white/70 backdrop-blur-sm p-4 shadow-sm border border-pastel-pink/30 relative">
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
          const sessionImage = sessionImageMap.get(dateStr)
          const isTodayDate = isToday(day)
          const isSelected = selectedDate === dateStr
          const dayOfWeek = (index % 7)

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg text-sm
                transition-all relative
                ${isSelected ? 'ring-2 ring-pastel-purple-dark bg-pastel-purple-light' : ''}
                ${isTodayDate && !isSelected ? 'ring-2 ring-pastel-purple font-bold' : ''}
                ${hasDiary && !isSelected && !sessionImage ? 'bg-pastel-mint-light text-gray-700 hover:bg-pastel-mint' : ''}
                ${!hasDiary && !isSelected ? 'hover:bg-pastel-pink-light' : ''}
                ${dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-600'}
                ${!hasDiary && !isTodayDate && !isSelected ? 'hover:text-pastel-purple-dark' : ''}
              `}
            >
              {/* Date number - smaller if has image */}
              <span className={sessionImage ? 'text-[10px] absolute top-0.5 left-1 z-10' : ''}>
                {day}
              </span>

              {/* Session image thumbnail */}
              {sessionImage ? (
                <CalendarThumbnail
                  imageUrl={sessionImage.imageUrl}
                  cropData={sessionImage.cropData}
                  size={28}
                  className="mt-1"
                  onMouseEnter={(e) => handleImageHover(e, sessionImage.imageUrl, dateStr)}
                  onMouseLeave={() => setHoveredImage(null)}
                  onClick={() => onImageEdit?.(dateStr, sessionImage.imageUrl)}
                />
              ) : (
                /* Indicators for non-image entries */
                <div className="flex gap-0.5 mt-0.5">
                  {hasDiary && (
                    <span className="w-1.5 h-1.5 rounded-full bg-pastel-purple" />
                  )}
                  {hasGoogleEvent && !hasDiary && (
                    <span className="w-1.5 h-1.5 rounded-full bg-pastel-peach" />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Hover preview popover */}
      {hoveredImage && (
        <div
          className="absolute z-50 w-48 h-48 rounded-xl shadow-xl overflow-hidden border-2 border-white bg-white pointer-events-none"
          style={{
            left: hoveredImage.position.x,
            top: hoveredImage.position.y,
          }}
        >
          <img
            src={hoveredImage.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

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
