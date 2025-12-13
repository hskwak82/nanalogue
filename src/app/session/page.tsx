'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTTS, useSTT } from '@/hooks/useSpeech'
import { VoiceInput, SpeakerToggle, PlayButton } from '@/components/VoiceInput'
import type { ConversationMessage } from '@/types/database'

export default function SessionPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Ref to store sendMessage function for voice callback
  const sendMessageRef = useRef<(text: string) => void>(() => {})

  // TTS hook
  const tts = useTTS()

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

  // AI 응답 후 입력창에 포커스
  useEffect(() => {
    if (!loading) {
      focusInput()
    }
  }, [loading])

  // TTS 자동 재생: AI 메시지가 추가되면 자동 재생
  useEffect(() => {
    if (messages.length > 0 && tts.isEnabled) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant' && !loading) {
        tts.speak(lastMessage.content)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading])

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
      setSessionId(existingSession.id)
      const conversation = existingSession.raw_conversation as ConversationMessage[]
      setMessages(conversation || [])
      setQuestionCount(
        conversation?.filter((m) => m.role === 'assistant').length || 0
      )

      if (existingSession.status === 'completed') {
        router.push(`/diary/${today}`)
        return
      }
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

      if (error) {
        console.error('Failed to create session:', JSON.stringify(error, null, 2))
        setError('세션 생성에 실패했습니다. 페이지를 새로고침해주세요.')
        return
      }

      setSessionId(newSession.id)

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
            .eq('id', newSession.id)
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
      }

      if (data.shouldEnd) {
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

  async function handleSessionComplete(finalMessages: ConversationMessage[]) {
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
      }
    } catch (error) {
      console.error('Failed to complete session:', error)
      setError('일기 생성에 실패했습니다. 네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">오늘의 대화</h1>
          <div className="flex items-center gap-3">
            <SpeakerToggle
              isEnabled={tts.isEnabled}
              isSupported={tts.isSupported}
              isSpeaking={tts.isSpeaking}
              onToggle={tts.toggle}
            />
            <span className="text-sm text-gray-500">
              {questionCount}/7 질문
            </span>
          </div>
        </div>
      </header>

      {/* Error Banner - 고정 위치 */}
      {error && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 px-4 py-4 shadow-lg">
          <div className="mx-auto max-w-2xl flex items-center justify-between">
            <p className="text-white font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-white hover:text-red-200 text-xl font-bold"
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
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-1">
                  <p className="whitespace-pre-wrap flex-1">{message.content}</p>
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
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex space-x-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="mx-auto max-w-2xl">
          {/* 녹음 중 표시 */}
          {stt.isListening && (
            <div className="mb-2 flex items-center justify-center gap-2 text-red-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-medium">녹음 중...</span>
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
              className="flex-1 resize-none rounded-2xl border-2 border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
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
              className="rounded-full bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
              >
                대화 마무리하고 일기 생성하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
