'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSTT, useTTS } from '@/hooks/useSpeech'
import type { ParsedSchedule } from '@/types/database'

interface AddScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onEventAdded: () => void
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export function AddScheduleModal({ isOpen, onClose, onEventAdded }: AddScheduleModalProps) {
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [currentSchedule, setCurrentSchedule] = useState<ParsedSchedule | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [waitingForAnswer, setWaitingForAnswer] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)
  const conversationEndRef = useRef<HTMLDivElement>(null)

  // Refs to always access latest state in callbacks
  const conversationRef = useRef(conversation)
  conversationRef.current = conversation
  const currentScheduleRef = useRef(currentSchedule)
  currentScheduleRef.current = currentSchedule

  const tts = useTTS()
  const ttsRef = useRef(tts)
  ttsRef.current = tts

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle STT silence end
  const handleSilenceEnd = useCallback((transcript: string) => {
    if (transcript.trim()) {
      handleUserInput(transcript.trim())
    }
  }, [])

  const stt = useSTT({
    silenceTimeout: 2000,
    onSilenceEnd: handleSilenceEnd,
  })
  const sttRef = useRef(stt)
  sttRef.current = stt

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ttsRef.current.stop()
      sttRef.current.stopListening()
    }
  }, [])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConversation([])
      setCurrentSchedule(null)
      setError(null)
      setWaitingForAnswer(false)
      setPendingClose(false)
      sttRef.current.resetTranscript()
      sttRef.current.stopListening()
      ttsRef.current.stop()
    } else {
      // Start with a greeting
      const greeting = '어떤 일정을 추가할까요?'
      setConversation([{ role: 'assistant', content: greeting }])
      setWaitingForAnswer(true)  // Enable auto-start listening after greeting
      // Auto-play greeting and start listening
      setTimeout(() => {
        ttsRef.current.speak(greeting)
      }, 300)
    }
  }, [isOpen])

  // Auto scroll to bottom
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  // Auto-start listening after TTS ends
  const wasSpeakingRef = useRef(false)
  useEffect(() => {
    if (wasSpeakingRef.current && !tts.isSpeaking && waitingForAnswer) {
      if (stt.isSupported && !stt.isListening) {
        setTimeout(() => sttRef.current.startListening(), 300)
      }
    }
    wasSpeakingRef.current = tts.isSpeaking
  }, [tts.isSpeaking, waitingForAnswer, stt])

  // Process user input
  const handleUserInput = async (text: string) => {
    sttRef.current.stopListening()
    setWaitingForAnswer(false)

    // Use refs to get latest state (avoid stale closure)
    const currentConversation = conversationRef.current
    const schedule = currentScheduleRef.current

    // Add user message to conversation
    const updatedConversation = [...currentConversation, { role: 'user' as const, content: text }]
    setConversation(updatedConversation)

    setIsLoading(true)
    setError(null)

    try {
      // Build full conversation history for context
      const conversationHistory = updatedConversation
        .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
        .join('\n')

      // Include current schedule state
      const scheduleContext = schedule
        ? `\n현재 파악된 일정: 제목="${schedule.title}", 날짜=${schedule.date || '미정'}, 시간=${schedule.time || '미정'}`
        : ''

      const response = await fetch('/api/chat/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          conversationHistory: conversationHistory + scheduleContext,
          currentSchedule: schedule,
          referenceDate: new Date().toISOString().split('T')[0],
        }),
      })
      const data = await response.json()

      if (data.schedules?.length > 0) {
        const newSchedule = data.schedules[0]

        // Merge with existing schedule info (use ref for latest state)
        const existingSchedule = currentScheduleRef.current
        const mergedSchedule: ParsedSchedule = {
          title: newSchedule.title || existingSchedule?.title || '',
          date: newSchedule.date || existingSchedule?.date || '',
          time: newSchedule.time || existingSchedule?.time,
          duration: newSchedule.duration || existingSchedule?.duration,
          isAllDay: newSchedule.isAllDay ?? existingSchedule?.isAllDay,
          confidence: newSchedule.confidence,
          isComplete: newSchedule.isComplete,
          missingFields: newSchedule.missingFields || [],
        }

        setCurrentSchedule(mergedSchedule)

        // Check if schedule is truly complete:
        // - Has title AND date AND (time OR isAllDay=true)
        const isScheduleComplete =
          mergedSchedule.title &&
          mergedSchedule.date &&
          (mergedSchedule.time || mergedSchedule.isAllDay === true)

        if (isScheduleComplete) {
          // Schedule is complete - save and close
          await saveScheduleToCalendar(mergedSchedule)
        } else if (data.followUpQuestion) {
          // Ask follow-up question for missing info
          setConversation(prev => [...prev, { role: 'assistant', content: data.followUpQuestion }])
          setWaitingForAnswer(true)
          ttsRef.current.speak(data.followUpQuestion)
        } else {
          // Generate appropriate follow-up based on what's missing
          let question = ''
          if (!mergedSchedule.title) {
            question = '무슨 일정인가요?'
          } else if (!mergedSchedule.date) {
            question = '언제 일정인가요?'
          } else if (!mergedSchedule.time && mergedSchedule.isAllDay !== true) {
            question = '종일 일정인가요, 아니면 시간이 정해져 있나요?'
          }

          if (question) {
            setConversation(prev => [...prev, { role: 'assistant', content: question }])
            setWaitingForAnswer(true)
            ttsRef.current.speak(question)
          }
        }
      } else {
        // Could not detect schedule
        const retryMsg = '일정 정보를 잘 이해하지 못했어요. 언제 무슨 일정인지 다시 말씀해 주세요.'
        setConversation(prev => [...prev, { role: 'assistant', content: retryMsg }])
        setWaitingForAnswer(true)
        ttsRef.current.speak(retryMsg)
      }
    } catch {
      setError('일정 파싱 중 오류가 발생했어요.')
    } finally {
      setIsLoading(false)
    }
  }

  // Watch for TTS completion to close modal
  useEffect(() => {
    if (pendingClose && !tts.isSpeaking) {
      onEventAdded()
      onClose()
    }
  }, [pendingClose, tts.isSpeaking, onEventAdded, onClose])

  // Save schedule to calendar and close after TTS
  const saveScheduleToCalendar = async (schedule: ParsedSchedule) => {
    if (!schedule.date || !schedule.title) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: schedule.title,
          date: schedule.date,
          time: schedule.time,
          duration: schedule.duration,
          isAllDay: schedule.isAllDay,
        }),
      })
      if (response.ok) {
        const timeDisplay = schedule.isAllDay ? '종일' : (schedule.time ? formatTime(schedule.time) : '종일')
        const successMsg = `${schedule.title}, ${formatDate(schedule.date)} ${timeDisplay}에 추가했어요!`
        setConversation(prev => [...prev, { role: 'assistant', content: successMsg }])
        ttsRef.current.speak(successMsg)
        // Set pending close - will close after TTS finishes
        setPendingClose(true)
      } else {
        throw new Error('Failed to create event')
      }
    } catch {
      setError('캘린더에 추가하는 중 오류가 발생했어요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMicClick = () => {
    if (stt.isListening) {
      sttRef.current.stopListening()
    } else {
      ttsRef.current.stop()
      sttRef.current.startListening()
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '날짜 미정'
    try {
      const date = new Date(dateStr + 'T00:00:00')
      if (isNaN(date.getTime())) return '날짜 미정'
      return date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
    } catch {
      return '날짜 미정'
    }
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
        onClick={() => {
          ttsRef.current.stop()
          sttRef.current.stopListening()
          onClose()
        }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pastel-pink/30">
          <h2 className="text-lg font-semibold text-gray-800">일정 추가</h2>
          <button
            onClick={() => {
              ttsRef.current.stop()
              sttRef.current.stopListening()
              onClose()
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-[200px]">
          {conversation.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-pastel-purple text-white'
                    : 'bg-pastel-warm text-gray-700'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-pastel-warm px-4 py-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-pastel-purple/60" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-pastel-purple/60 [animation-delay:0.2s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-pastel-purple/60 [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={conversationEndRef} />
        </div>

        {/* Current Schedule Preview */}
        {currentSchedule && currentSchedule.title && (
          <div className="px-6 py-3 bg-pastel-mint-light border-t border-pastel-mint/30">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-pastel-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">{currentSchedule.title}</span>
              <span className="text-xs text-gray-500">
                {currentSchedule.date ? formatDate(currentSchedule.date) : '날짜 미정'}
                {currentSchedule.time ? ` ${formatTime(currentSchedule.time)}` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-6 py-2 bg-pastel-peach-light">
            <p className="text-sm text-center text-red-500">{error}</p>
          </div>
        )}

        {/* Voice Input Section */}
        <div className="px-6 py-4 border-t border-pastel-pink/30 bg-pastel-warm/30">
          <div className="flex items-center gap-4">
            {/* Mic Button */}
            <button
              onClick={handleMicClick}
              disabled={!mounted || !stt.isSupported || isLoading}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                stt.isListening
                  ? 'bg-pastel-peach animate-pulse'
                  : 'bg-white border-2 border-pastel-purple hover:bg-pastel-purple-light'
              } ${(!stt.isSupported || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg
                className={`w-6 h-6 ${stt.isListening ? 'text-white' : 'text-pastel-purple'}`}
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

            {/* Status Text */}
            <div className="flex-1 text-sm text-gray-500">
              {stt.isListening ? (
                <span className="text-pastel-peach font-medium">
                  {stt.transcript || '듣고 있어요...'}
                </span>
              ) : tts.isSpeaking ? (
                <span className="text-pastel-purple">말하는 중...</span>
              ) : (
                <span>마이크를 눌러 말씀해 주세요</span>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
