'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ConversationMessage } from '@/types/database'

export default function SessionPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [initialized, setInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

    const today = new Date().toISOString().split('T')[0]

    // Check for existing session today
    const { data: existingSession } = await supabase
      .from('daily_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .single()

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
        console.error('Failed to create session:', error)
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
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage: ConversationMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')

    // Save immediately
    await supabase
      .from('daily_sessions')
      .update({ raw_conversation: updatedMessages })
      .eq('id', sessionId)

    // Check if we should end session (after 5-7 questions)
    if (questionCount >= 6) {
      await handleSessionComplete(updatedMessages)
    } else {
      await generateNextQuestion(updatedMessages)
    }
  }

  async function handleSessionComplete(finalMessages: ConversationMessage[]) {
    setLoading(true)

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
      }
    } catch (error) {
      console.error('Failed to complete session:', error)
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
          <span className="text-sm text-gray-500">
            {questionCount}/7 질문
          </span>
        </div>
      </header>

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
                <p className="whitespace-pre-wrap">{message.content}</p>
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
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="메시지를 입력하세요..."
              disabled={loading}
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="rounded-full bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              전송
            </button>
          </div>

          {questionCount >= 5 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => handleSessionComplete(messages)}
                disabled={loading}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
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
