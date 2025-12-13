'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSTT } from '@/hooks/useSpeech'
import type { ParsedSchedule } from '@/types/database'

interface AddScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onEventAdded: () => void
}

export function AddScheduleModal({ isOpen, onClose, onEventAdded }: AddScheduleModalProps) {
  const [input, setInput] = useState('')
  const [parsedSchedules, setParsedSchedules] = useState<ParsedSchedule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSilenceEnd = useCallback((transcript: string) => {
    if (transcript.trim()) {
      setInput(transcript)
      parseSchedule(transcript)
    }
  }, [])

  const stt = useSTT({
    silenceTimeout: 2000,
    onSilenceEnd: handleSilenceEnd,
  })

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setInput('')
      setParsedSchedules([])
      setError(null)
      stt.resetTranscript()
    }
  }, [isOpen])

  const parseSchedule = async (text: string) => {
    setIsParsing(true)
    setError(null)
    try {
      const response = await fetch('/api/chat/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          referenceDate: new Date().toISOString().split('T')[0],
        }),
      })
      const data = await response.json()
      if (data.schedules?.length > 0) {
        setParsedSchedules(data.schedules)
      } else {
        setError('일정을 감지하지 못했어요. 다시 말씀해 주세요.')
      }
    } catch {
      setError('일정 파싱 중 오류가 발생했어요.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleAddToCalendar = async () => {
    if (parsedSchedules.length === 0) return

    setIsLoading(true)
    setError(null)
    try {
      for (const schedule of parsedSchedules) {
        const response = await fetch('/api/calendar/create-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: schedule.title,
            date: schedule.date,
            time: schedule.time,
          }),
        })
        if (!response.ok) {
          throw new Error('Failed to create event')
        }
      }
      onEventAdded()
      onClose()
    } catch {
      setError('캘린더에 추가하는 중 오류가 발생했어요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMicClick = () => {
    if (stt.isListening) {
      stt.stopListening()
    } else {
      setParsedSchedules([])
      setError(null)
      stt.startListening()
    }
  }

  const handleTextSubmit = () => {
    if (input.trim()) {
      parseSchedule(input.trim())
    }
  }

  const removeSchedule = (index: number) => {
    setParsedSchedules((prev) => prev.filter((_, i) => i !== index))
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '종일'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? '오후' : '오전'
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${ampm} ${hour12}:${minutes}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pastel-pink/30">
          <h2 className="text-lg font-semibold text-gray-800">일정 추가</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Voice Input Section */}
          <div className="text-center space-y-4">
            <button
              onClick={handleMicClick}
              disabled={!mounted || !stt.isSupported}
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all ${
                stt.isListening
                  ? 'bg-pastel-peach animate-pulse'
                  : 'bg-pastel-warm hover:bg-pastel-peach-light'
              } ${!stt.isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg
                className={`w-8 h-8 ${stt.isListening ? 'text-white' : 'text-gray-600'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
            <p className="text-sm text-gray-500">
              {stt.isListening
                ? stt.transcript || '듣고 있어요...'
                : mounted && stt.isSupported
                ? '마이크를 눌러 말씀해 주세요'
                : '음성 인식을 지원하지 않아요'}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-pastel-pink/30" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-pastel-pink/30" />
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              placeholder="예: 내일 3시에 회의"
              className="w-full px-4 py-3 rounded-xl border border-pastel-pink/50 bg-pastel-warm/50 focus:outline-none focus:ring-2 focus:ring-pastel-purple/50 text-gray-700 placeholder-gray-400"
            />
            <button
              onClick={handleTextSubmit}
              disabled={!input.trim() || isParsing}
              className="w-full py-2 text-sm text-pastel-purple hover:text-pastel-purple-dark disabled:text-gray-400 transition-colors"
            >
              {isParsing ? '분석 중...' : '텍스트로 입력'}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-center text-red-500">{error}</p>
          )}

          {/* Parsed Schedules */}
          {parsedSchedules.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">감지된 일정</h3>
              <div className="space-y-2">
                {parsedSchedules.map((schedule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-pastel-mint-light border border-pastel-mint"
                  >
                    <svg className="w-5 h-5 text-pastel-purple flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{schedule.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(schedule.date)} {formatTime(schedule.time)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSchedule(idx)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-pastel-pink/30 bg-pastel-warm/30">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-pastel-pink text-gray-600 hover:bg-pastel-pink-light transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleAddToCalendar}
            disabled={parsedSchedules.length === 0 || isLoading}
            className="flex-1 py-3 rounded-xl bg-pastel-purple text-white hover:bg-pastel-purple-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '추가 중...' : '캘린더에 추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
