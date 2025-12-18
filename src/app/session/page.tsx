'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTTS, useSTT } from '@/hooks/useSpeech'
import { VoiceInput, SpeakerToggle, PlayButton } from '@/components/VoiceInput'
import { SpeakingText } from '@/components/SpeakingText'
import { Toast } from '@/components/Toast'
import type { ConversationMessage, ParsedSchedule, PendingSchedule } from '@/types/database'

export default function SessionPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userVoice, setUserVoice] = useState<string | undefined>(undefined)
  const [isCompleting, setIsCompleting] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null)
  const [isCalendarConnected, setIsCalendarConnected] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [pendingSchedule, setPendingSchedule] = useState<PendingSchedule | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Ref to store sendMessage function for voice callback
  const sendMessageRef = useRef<(text: string) => void>(() => {})

  // TTS hook with user's voice preference
  const tts = useTTS({ voice: userVoice })

  // STT hook with auto-send on silence (2 seconds)
  const stt = useSTT({
    silenceTimeout: 2000,
    onSilenceEnd: (transcript) => {
      if (transcript.trim()) {
        sendMessageRef.current(transcript.trim())
      }
    },
  })

  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const focusInput = () => {
    inputRef.current?.focus()
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // AI 응답 후 입력창에 포커스 (데스크톱만)
  useEffect(() => {
    if (!loading) {
      // 모바일에서는 키보드 자동 팝업 방지
      const isMobile = window.innerWidth < 768 || 'ontouchstart' in window
      if (!isMobile) {
        focusInput()
      }
    }
  }, [loading])

  // TTS 자동 재생: AI 메시지가 추가되면 자동 재생
  useEffect(() => {
    // Don't auto-play if completing session (about to redirect)
    if (isCompleting) return

    if (messages.length > 0 && tts.isEnabled) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && !loading) {
        tts.speak(lastMessage.content)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading, isCompleting])

  // STT 결과를 입력창에 반영
  useEffect(() => {
    if (stt.transcript) {
      setInput(stt.transcript)
    }
  }, [stt.transcript])

  // 마이크 토글 핸들러
  const handleMicToggle = useCallback(() => {
    if (stt.isListening) {
      stt.stopListening()
    } else {
      // 이전 녹음이 전송된 경우 입력창 초기화
      if (stt.wasSent()) {
        setInput('')
      }
      stt.startListening()
    }
  }, [stt])

  // 개별 메시지 재생
  const handlePlayMessage = useCallback(
    (index: number, content: string) => {
      if (playingMessageIndex === index && tts.isSpeaking) {
        tts.stop()
        setPlayingMessageIndex(null)
      } else {
        tts.stop()
        setPlayingMessageIndex(index)
        tts.speak(content)
      }
    },
    [playingMessageIndex, tts]
  )

  // TTS가 끝나면 재생 상태 초기화 및 자동으로 STT 시작
  const wasSpeakingRef = useRef(false)
  useEffect(() => {
    // TTS가 끝났을 때 (speaking -> not speaking)
    if (wasSpeakingRef.current && !tts.isSpeaking) {
      // 재생 상태 초기화
      if (playingMessageIndex !== null) {
        setPlayingMessageIndex(null)
      }
      // 자동으로 마이크 입력 시작 (TTS 활성화 상태이고, 로딩 중이 아닐 때)
      if (tts.isEnabled && stt.isSupported && !loading && !stt.isListening) {
        // 이전 녹음이 전송된 경우 입력창 초기화
        if (stt.wasSent()) {
          setInput('')
        }
        stt.startListening()
      }
    }
    wasSpeakingRef.current = tts.isSpeaking
  }, [tts.isSpeaking, tts.isEnabled, stt, loading, playingMessageIndex])

  const initializeSession = useCallback(async () => {
    if (initialized) return
    setInitialized(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Ensure profile exists (in case trigger didn't run)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    // Fetch user's voice preference
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('tts_voice')
      .eq('user_id', user.id)
      .single()

    if (preferences?.tts_voice) {
      setUserVoice(preferences.tts_voice)
    }

    // Check if calendar is connected
    const { data: calendarToken } = await supabase
      .from('calendar_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .maybeSingle()

    setIsCalendarConnected(!!calendarToken)

    if (!profile) {
      // Create profile manually
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || null,
      })
      // Create preferences
      await supabase.from('user_preferences').insert({
        user_id: user.id,
      })
      // Create subscription
      await supabase.from('subscriptions').insert({
        user_id: user.id,
      })
    }

    const today = new Date().toISOString().split('T')[0]

    // Check for existing session today
    const { data: existingSession, error: fetchError } = await supabase
      .from('daily_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .maybeSingle()

    if (fetchError) {
      console.error('Failed to fetch session:', fetchError)
      setError('세션을 불러오는데 실패했습니다.')
      return
    }

    if (existingSession) {
      // If completed, show confirmation dialog instead of auto-reset
      if (existingSession.status === 'completed') {
        setCompletedSessionId(existingSession.id)
        setShowRestartConfirm(true)
        return
      }

      setSessionId(existingSession.id)
      const conversation = existingSession.raw_conversation as ConversationMessage[]
      setMessages(conversation || [])
      setQuestionCount(
        conversation?.filter((m) => m.role === 'assistant').length || 0
      )
    } else {
      // Create new session
      const { data: newSession, error } = await supabase
        .from('daily_sessions')
        .insert({
          user_id: user.id,
          session_date: today,
          status: 'active',
          raw_conversation: [],
        })
        .select()
        .single()

      let currentSessionId: string

      if (error) {
        // If duplicate key error, try to fetch existing session again (race condition)
        if (error.code === '23505') {
          console.log('Session already exists, fetching existing session...')
          const { data: retrySession } = await supabase
            .from('daily_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('session_date', today)
            .single()

          if (retrySession) {
            // Reset and start fresh
            await supabase
              .from('daily_sessions')
              .update({
                status: 'active',
                raw_conversation: [],
                completed_at: null,
              })
              .eq('id', retrySession.id)

            currentSessionId = retrySession.id
          } else {
            setError('세션 생성에 실패했습니다. 페이지를 새로고침해주세요.')
            return
          }
        } else {
          console.error('Failed to create session:', error)
          setError('세션 생성에 실패했습니다. 페이지를 새로고침해주세요.')
          return
        }
      } else {
        currentSessionId = newSession.id
      }

      setSessionId(currentSessionId)

      // Start with greeting - fetch directly
      setLoading(true)
      try {
        const response = await fetch('/api/chat/next-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [],
            questionCount: 0,
          }),
        })
        const data = await response.json()
        if (data.question) {
          const aiMessage: ConversationMessage = {
            role: 'assistant',
            content: data.question,
            timestamp: new Date().toISOString(),
            purpose: data.purpose,
          }
          setMessages([aiMessage])
          setQuestionCount(1)

          // Save to database
          await supabase
            .from('daily_sessions')
            .update({ raw_conversation: [aiMessage] })
            .eq('id', currentSessionId)
        }
      } catch (error) {
        console.error('Failed to generate question:', error)
      } finally {
        setLoading(false)
      }
    }
  }, [initialized, router, supabase])

  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  // Helper function to add schedule to calendar
  async function addScheduleToCalendar(schedule: ParsedSchedule) {
    try {
      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: schedule.title,
          date: schedule.date,
          time: schedule.time,
          duration: schedule.duration,
        }),
      })
      if (response.ok) {
        setToast({
          message: `"${schedule.title}" 일정이 캘린더에 추가되었어요!`,
          type: 'success',
        })
        return true
      }
    } catch (err) {
      console.error('Failed to add schedule to calendar:', err)
    }
    return false
  }

  async function generateNextQuestion(currentMessages: ConversationMessage[]) {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          questionCount,
          pendingSchedule: pendingSchedule ? {
            id: pendingSchedule.id,
            title: pendingSchedule.title,
            date: pendingSchedule.date,
            time: pendingSchedule.time,
            duration: pendingSchedule.duration,
            endDate: pendingSchedule.endDate,
            missingFields: pendingSchedule.missingFields,
          } : undefined,
        }),
      })

      const data = await response.json()

      if (data.question) {
        const aiMessage: ConversationMessage = {
          role: 'assistant',
          content: data.question,
          timestamp: new Date().toISOString(),
          purpose: data.purpose,
        }

        const updatedMessages = [...currentMessages, aiMessage]
        setMessages(updatedMessages)
        setQuestionCount((prev) => prev + 1)

        // Save to database
        await supabase
          .from('daily_sessions')
          .update({ raw_conversation: updatedMessages })
          .eq('id', sessionId)

        // Handle calendar integration
        if (isCalendarConnected) {
          // First, check if pending schedule was completed
          if (data.updatedPendingSchedule && data.updatedPendingSchedule.isComplete) {
            await addScheduleToCalendar(data.updatedPendingSchedule)
            setPendingSchedule(null)
          }

          // Handle newly detected schedules
          if (data.detectedSchedules && data.detectedSchedules.length > 0) {
            for (const schedule of data.detectedSchedules as ParsedSchedule[]) {
              if (schedule.confidence >= 0.8) {
                if (schedule.isComplete) {
                  // Complete schedule - add to calendar immediately
                  await addScheduleToCalendar(schedule)
                } else if (schedule.missingFields && schedule.missingFields.length > 0) {
                  // Incomplete schedule - set as pending for follow-up
                  setPendingSchedule({
                    ...schedule,
                    id: `schedule-${Date.now()}`,
                    status: 'pending',
                  })
                  // Show info toast
                  setToast({
                    message: `"${schedule.title}" 일정 정보를 확인 중이에요`,
                    type: 'info',
                  })
                }
              }
            }
          }
        }
      }

      if (data.shouldEnd) {
        // Add any pending schedule before ending
        if (pendingSchedule && isCalendarConnected) {
          await addScheduleToCalendar(pendingSchedule)
          setPendingSchedule(null)
        }
        await handleSessionComplete(currentMessages)
      }
    } catch (error) {
      console.error('Failed to generate question:', error)
      setError('질문 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 메시지 전송 함수 (텍스트 또는 입력창 내용 사용)
  const sendMessage = useCallback(
    async (text?: string) => {
      const messageText = text || input.trim()
      if (!messageText || loading) return

      const userMessage: ConversationMessage = {
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString(),
      }

      const currentMessages = [...messages, userMessage]
      setMessages(currentMessages)
      setInput('')
      stt.resetTranscript()
      setError(null)

      // Save immediately
      await supabase
        .from('daily_sessions')
        .update({ raw_conversation: currentMessages })
        .eq('id', sessionId)

      // Check if we should end session (after 5-7 questions)
      if (questionCount >= 6) {
        await handleSessionComplete(currentMessages)
      } else {
        await generateNextQuestion(currentMessages)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, loading, messages, sessionId, questionCount, supabase, stt]
  )

  // Update ref for voice callback
  useEffect(() => {
    sendMessageRef.current = sendMessage
  }, [sendMessage])

  async function handleSend() {
    await sendMessage()
  }

  // Handle restart session after confirmation
  async function handleRestartSession() {
    if (!completedSessionId) return

    setShowRestartConfirm(false)
    setLoading(true)

    try {
      // Reset session to active state
      await supabase
        .from('daily_sessions')
        .update({
          status: 'active',
          raw_conversation: [],
          completed_at: null,
        })
        .eq('id', completedSessionId)

      setSessionId(completedSessionId)
      setMessages([])
      setQuestionCount(0)

      // Start with greeting
      const response = await fetch('/api/chat/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          questionCount: 0,
        }),
      })
      const data = await response.json()
      if (data.question) {
        const aiMessage: ConversationMessage = {
          role: 'assistant',
          content: data.question,
          timestamp: new Date().toISOString(),
          purpose: data.purpose,
        }
        setMessages([aiMessage])
        setQuestionCount(1)

        await supabase
          .from('daily_sessions')
          .update({ raw_conversation: [aiMessage] })
          .eq('id', completedSessionId)
      }
    } catch (err) {
      console.error('Failed to restart session:', err)
      setError('세션 재시작에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // View existing diary
  function handleViewDiary() {
    const today = new Date().toISOString().split('T')[0]
    router.push(`/diary/${today}`)
  }

  async function handleSessionComplete(finalMessages: ConversationMessage[]) {
    // Mark as completing to prevent TTS auto-play
    setIsCompleting(true)

    // Stop TTS if speaking
    tts.stop()
    stt.stopListening()

    setLoading(true)
    setError(null)

    try {
      // Generate diary
      const response = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: finalMessages,
        }),
      })

      // Check HTTP status first
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || `일기 생성 실패 (${response.status}). API 할당량 초과일 수 있습니다. 1분 후 다시 시도해주세요.`)
        setIsCompleting(false) // Reset so user can retry
        return
      }

      const data = await response.json()

      if (data.success) {
        // Update session status
        await supabase
          .from('daily_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', sessionId)

        // Redirect to diary
        const today = new Date().toISOString().split('T')[0]
        router.push(`/diary/${today}`)
      } else {
        // Show error message
        setError(data.error || '일기 생성에 실패했습니다.')
        setIsCompleting(false) // Reset so user can retry
      }
    } catch (error) {
      console.error('Failed to complete session:', error)
      setError('일기 생성에 실패했습니다. 네트워크 오류가 발생했습니다.')
      setIsCompleting(false) // Reset so user can retry
    } finally {
      setLoading(false)
    }
  }

  // Show restart confirmation dialog
  if (showRestartConfirm) {
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-pastel-cream px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-sm p-8 shadow-lg border border-pastel-pink/30">
          <h2 className="mb-2 text-xl font-bold text-gray-700">
            오늘의 일기가 있습니다
          </h2>
          <p className="mb-6 text-gray-500">
            {today} 일기가 이미 작성되어 있습니다.
            <br />
            기존 일기를 보시겠습니까, 새로 작성하시겠습니까?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleViewDiary}
              className="w-full rounded-full bg-pastel-purple px-4 py-3 font-medium text-white hover:bg-pastel-purple-dark transition-all"
            >
              기존 일기 보기
            </button>
            <button
              onClick={handleRestartSession}
              className="w-full rounded-full border border-pastel-pink px-4 py-3 font-medium text-gray-600 hover:bg-pastel-pink-light transition-all"
            >
              새로 작성하기
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 text-sm text-gray-400 hover:text-pastel-purple-dark transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-pastel-cream">
      {/* Header */}
      <header className="border-b border-pastel-pink bg-white/80 backdrop-blur-sm px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-full p-2 text-gray-500 hover:bg-pastel-pink-light hover:text-pastel-purple-dark transition-all"
              title="홈으로"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-700">오늘의 대화</h1>
          </div>
          <div className="flex items-center gap-3">
            <SpeakerToggle
              isEnabled={tts.isEnabled}
              isSupported={tts.isSupported}
              isSpeaking={tts.isSpeaking}
              onToggle={tts.toggle}
            />
            <span className="text-sm text-pastel-purple-dark">
              {questionCount}/7 질문
            </span>
          </div>
        </div>
      </header>

      {/* Error Banner - 고정 위치 */}
      {error && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-pastel-peach px-4 py-4 shadow-lg border-b border-pastel-peach-light">
          <div className="mx-auto max-w-2xl flex items-center justify-between">
            <p className="text-gray-700 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-gray-600 hover:text-gray-800 text-xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-pastel-purple text-white'
                    : 'bg-white/80 text-gray-700 shadow-sm border border-pastel-pink/30'
                }`}
              >
                <div className="flex items-start gap-1">
                  <p className="whitespace-pre-wrap flex-1">
                    {message.role === 'assistant' && tts.currentText === message.content ? (
                      <SpeakingText
                        text={message.content}
                        progress={tts.progress}
                        isSpeaking={tts.isSpeaking}
                      />
                    ) : (
                      message.content
                    )}
                  </p>
                  {message.role === 'assistant' && tts.isSupported && (
                    <PlayButton
                      isPlaying={playingMessageIndex === index && tts.isSpeaking}
                      onClick={() => handlePlayMessage(index, message.content)}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm border border-pastel-pink/30">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-pastel-purple/60" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-pastel-purple/60 [animation-delay:0.2s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-pastel-purple/60 [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-pastel-pink bg-white/80 backdrop-blur-sm p-4">
        <div className="mx-auto max-w-2xl">
          {/* 녹음 중 표시 */}
          {stt.isListening && (
            <div className="mb-2 flex items-center justify-center gap-2 text-pastel-peach">
              <span className="h-2 w-2 animate-pulse rounded-full bg-pastel-peach" />
              <span className="text-sm font-medium text-gray-600">녹음 중...</span>
            </div>
          )}

          <div className="flex space-x-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Cmd+Enter or Ctrl+Enter to send
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={stt.isListening ? '말씀하세요...' : '메시지를 입력하세요... (Cmd+Enter로 전송)'}
              disabled={loading}
              rows={2}
              className="flex-1 resize-none rounded-2xl border-2 border-pastel-pink bg-white px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-pastel-purple focus:outline-none focus:ring-1 focus:ring-pastel-purple disabled:bg-pastel-warm disabled:text-gray-500"
            />
            <VoiceInput
              isListening={stt.isListening}
              isSupported={stt.isSupported}
              disabled={loading}
              onToggle={handleMicToggle}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="rounded-full bg-pastel-purple px-6 py-3 font-medium text-white hover:bg-pastel-purple-dark transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              전송
            </button>
          </div>

          {/* 사용자가 한 번이라도 답변했으면 일기 생성 버튼 표시 */}
          {messages.some((m) => m.role === 'user') && (
            <div className="mt-4 text-center">
              <button
                onClick={() => handleSessionComplete(messages)}
                disabled={loading}
                className="text-sm font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors disabled:opacity-50"
              >
                대화 마무리하고 일기 생성하기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast for schedule notifications */}
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
