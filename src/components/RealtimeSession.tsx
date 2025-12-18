'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeVoice, type RealtimeState } from '@/hooks/useRealtimeVoice'
import { MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline'
import { cleanupWebRTC, stopAllMicrophones, blockConnections, allowConnections } from '@/lib/webrtc-cleanup'

interface RealtimeSessionProps {
  onComplete?: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void
  onCancel?: () => void
}

interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function RealtimeSession({ onComplete, onCancel }: RealtimeSessionProps) {
  const router = useRouter()
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([])
  const [currentUserText, setCurrentUserText] = useState('')
  const [currentAIText, setCurrentAIText] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [conversationStarted, setConversationStarted] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const transcriptsEndRef = useRef<HTMLDivElement>(null)

  // Track if disconnect was triggered (to prevent reconnection)
  const isDisconnecting = useRef(false)

  // Track pending AI response to ensure correct ordering (user message before AI response)
  const pendingAIResponse = useRef<string | null>(null)
  const waitingForUserTranscript = useRef(false)

  const realtime = useRealtimeVoice({
    onTranscript: (text, isFinal) => {
      console.log('[RealtimeSession] onTranscript:', { text, isFinal, isDisconnecting: isDisconnecting.current })
      // Ignore if disconnecting
      if (isDisconnecting.current) return

      if (isFinal && text.trim()) {
        // Add user message first
        setTranscripts((prev) => [
          ...prev,
          { role: 'user', content: text, timestamp: new Date() },
        ])
        setCurrentUserText('')
        waitingForUserTranscript.current = false

        // Now add any pending AI response that was waiting
        if (pendingAIResponse.current) {
          const aiText = pendingAIResponse.current
          pendingAIResponse.current = null
          setTranscripts((prev) => [
            ...prev,
            { role: 'assistant', content: aiText, timestamp: new Date() },
          ])
        }
      } else {
        setCurrentUserText(text)
        waitingForUserTranscript.current = true
      }
    },
    onAIResponse: (text) => {
      // Ignore if disconnecting
      if (isDisconnecting.current) return

      if (text.trim()) {
        // If we're waiting for user transcript, queue the AI response
        if (waitingForUserTranscript.current) {
          pendingAIResponse.current = text
        } else {
          setTranscripts((prev) => [
            ...prev,
            { role: 'assistant', content: text, timestamp: new Date() },
          ])
        }
      }
      setCurrentAIText('')
    },
    onError: (error) => {
      console.error('Realtime error:', error)
      setConnectionError(error.message || '연결 오류가 발생했습니다')
    },
    onStateChange: (state) => {
      console.log('[RealtimeSession] State change:', state, 'isDisconnecting:', isDisconnecting.current)
    },
  })

  // Update current AI text from hook
  useEffect(() => {
    setCurrentAIText(realtime.aiTranscript)
  }, [realtime.aiTranscript])

  // Auto-scroll to bottom
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts, currentUserText, currentAIText])

  // Common disconnect logic
  const performDisconnect = useCallback(() => {
    console.log('[RealtimeSession] performDisconnect called, isDisconnecting:', isDisconnecting.current)

    // Prevent duplicate calls
    if (isDisconnecting.current) {
      console.log('[RealtimeSession] Already disconnecting, ignoring')
      return false
    }

    // Prevent reconnection - set FIRST before any async operations
    isDisconnecting.current = true

    // Block all future WebRTC connections globally
    blockConnections()

    console.log('[RealtimeSession] Step 1: Stopping microphones')
    stopAllMicrophones()

    console.log('[RealtimeSession] Step 2: Interrupting AI')
    realtime.interrupt()

    console.log('[RealtimeSession] Step 3: Disconnecting WebRTC')
    realtime.disconnect()

    console.log('[RealtimeSession] Step 4: Full cleanup')
    cleanupWebRTC()

    return true
  }, [realtime])

  // Cancel - disconnect and go to home
  const handleCancel = useCallback(() => {
    console.log('[RealtimeSession] handleCancel called')

    // Reset UI state immediately to prevent flash
    setConversationStarted(false)

    performDisconnect()

    // Navigate to home
    if (onCancel) {
      onCancel()
    } else {
      router.push('/home')
    }
  }, [performDisconnect, onCancel, router])

  // Generate diary - disconnect and call onComplete
  const handleGenerateDiary = useCallback(() => {
    console.log('[RealtimeSession] handleGenerateDiary called')

    if (!performDisconnect()) {
      return // Already disconnecting
    }

    // Capture transcripts now before any state changes
    const currentTranscripts = [...transcripts]
    console.log('[RealtimeSession] Captured', currentTranscripts.length, 'transcripts for export')

    // Small delay to ensure all resources are released before proceeding
    setTimeout(() => {
      console.log('[RealtimeSession] Final cleanup and onComplete')
      stopAllMicrophones()
      cleanupWebRTC()

      // Export conversation
      if (currentTranscripts.length > 0 && onComplete) {
        console.log('[RealtimeSession] Calling onComplete with', currentTranscripts.length, 'messages')
        onComplete(
          currentTranscripts.map((t) => ({
            role: t.role,
            content: t.content,
          }))
        )
      }
    }, 300)
  }, [performDisconnect, transcripts, onComplete])

  // Store disconnect ref for cleanup
  const disconnectRef = useRef(realtime.disconnect)
  useEffect(() => {
    disconnectRef.current = realtime.disconnect
  }, [realtime.disconnect])

  // Cleanup on unmount - disconnect when navigating away
  useEffect(() => {
    return () => {
      console.log('[RealtimeSession] Unmounting, cleaning up')
      isDisconnecting.current = true
      stopAllMicrophones()
      disconnectRef.current()
      cleanupWebRTC()
    }
  }, [])

  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted)
    // TODO: Actually mute the microphone stream
  }, [isMuted])

  // Reset connection blocking on mount
  useEffect(() => {
    allowConnections()
    isDisconnecting.current = false
  }, [])

  // Handle start conversation button click - connect then start
  const handleStartConversation = useCallback(async () => {
    console.log('[RealtimeSession] Starting conversation')
    setConnectionError(null)
    setConversationStarted(true)
    await realtime.connect()
  }, [realtime])

  // Trigger AI greeting when connection becomes ready
  useEffect(() => {
    if (conversationStarted && realtime.isReady && transcripts.length === 0) {
      console.log('[RealtimeSession] Connection ready, triggering AI greeting')
      realtime.startConversation()
    }
  }, [conversationStarted, realtime.isReady, transcripts.length, realtime.startConversation])

  const getStateLabel = (state: RealtimeState): string => {
    switch (state) {
      case 'idle':
        return '연결 대기'
      case 'connecting':
        return '연결 중...'
      case 'connected':
        return '대화 준비됨'
      case 'listening':
        return '듣는 중...'
      case 'processing':
        return '처리 중...'
      case 'speaking':
        return 'AI 응답 중...'
      case 'error':
        return '오류 발생'
      default:
        return state
    }
  }

  const getStateColor = (state: RealtimeState): string => {
    switch (state) {
      case 'idle':
        return 'bg-gray-400'
      case 'connecting':
        return 'bg-yellow-400 animate-pulse'
      case 'connected':
        return 'bg-green-400'
      case 'listening':
        return 'bg-blue-500 animate-pulse'
      case 'processing':
        return 'bg-purple-500 animate-pulse'
      case 'speaking':
        return 'bg-indigo-500 animate-pulse'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  if (!realtime.isSupported) {
    const isSecure = typeof window !== 'undefined' && window.isSecureContext

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎤</div>
          <h2 className="text-xl font-semibold text-gray-900">
            {isSecure
              ? '실시간 대화를 지원하지 않는 브라우저입니다'
              : '보안 연결(HTTPS)이 필요합니다'}
          </h2>
          <p className="text-gray-500">
            {isSecure
              ? 'Chrome, Edge, Safari 최신 버전을 사용해주세요.'
              : '마이크 접근을 위해 HTTPS 연결이 필요합니다. 데스크톱에서 localhost로 접속하거나 HTTPS를 사용해주세요.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStateColor(realtime.state)}`} />
          <span className="text-sm font-medium text-gray-700">
            {getStateLabel(realtime.state)}
          </span>
        </div>

        {realtime.isConnected && (
          <button
            onClick={handleMuteToggle}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? (
              <SpeakerXMarkIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <SpeakerWaveIcon className="h-5 w-5 text-gray-700" />
            )}
          </button>
        )}
      </div>

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-pastel-cream-light">
        {/* State 1: Initial - show start button */}
        {!conversationStarted && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pastel-purple to-pastel-pink flex items-center justify-center shadow-lg">
              <MicrophoneIcon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                실시간 음성 대화
              </h2>
              {connectionError ? (
                <div className="space-y-4">
                  <p className="text-red-500 max-w-sm text-sm">
                    오류: {connectionError}
                  </p>
                  <button
                    onClick={handleStartConversation}
                    className="px-8 py-4 rounded-full bg-red-500 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    다시 시도
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-500 mb-6">
                    버튼을 누르면 AI가 대화를 시작해요
                  </p>
                  <button
                    onClick={handleStartConversation}
                    className="px-8 py-4 rounded-full bg-gradient-to-r from-pastel-purple to-pastel-pink text-white font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    대화 시작
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* State 2: Connecting & waiting for first message */}
        {conversationStarted && transcripts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pastel-purple to-pastel-pink flex items-center justify-center animate-pulse">
              <MicrophoneIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              대화 준비 중...
            </h2>
          </div>
        )}

        {/* Transcript Messages */}
        {transcripts.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-pastel-purple text-white rounded-br-md'
                  : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.role === 'user' ? 'text-pastel-purple-light' : 'text-gray-400'
                }`}
              >
                {msg.timestamp.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Current User Speech - show when listening or has interim text */}
        {(realtime.isListening || currentUserText) && (
          <div className="flex justify-end">
            <div className="min-w-[280px] max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-pastel-purple/70 text-white">
              {currentUserText ? (
                <p className="whitespace-pre-wrap">{currentUserText}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Real-time oscilloscope waveform */}
                  <svg
                    viewBox="0 0 256 64"
                    className="w-full h-12"
                    preserveAspectRatio="none"
                  >
                    {/* Waveform path */}
                    <path
                      d={`M 0 32 ${realtime.audioLevel.map((v, i) =>
                        `L ${(i / realtime.audioLevel.length) * 256} ${32 - v * 28}`
                      ).join(' ')}`}
                      fill="none"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Glow effect */}
                    <path
                      d={`M 0 32 ${realtime.audioLevel.map((v, i) =>
                        `L ${(i / realtime.audioLevel.length) * 256} ${32 - v * 28}`
                      ).join(' ')}`}
                      fill="none"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Center line */}
                    <line
                      x1="0" y1="32" x2="256" y2="32"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  </svg>
                  <span className="text-sm text-center">듣는 중...</span>
                </div>
              )}
              <p className="text-xs mt-1 text-pastel-purple-light text-right">
                {currentUserText ? '말하는 중...' : '음성 인식 중'}
              </p>
            </div>
          </div>
        )}

        {/* Current AI Response (streaming) */}
        {currentAIText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3 bg-white text-gray-900 shadow-sm">
              <p className="whitespace-pre-wrap">{currentAIText}</p>
              <p className="text-xs mt-1 text-gray-400">응답 중...</p>
            </div>
          </div>
        )}

        {/* Loading indicator when processing */}
        {realtime.state === 'processing' && !currentAIText && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={transcriptsEndRef} />
      </div>

      {/* Control Area - only show when conversation has started */}
      {conversationStarted && realtime.isConnected && (
        <div className="flex items-center justify-center gap-3 px-4 py-6 bg-white border-t">
          {/* Visual indicator of listening state */}
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              realtime.isListening
                ? 'bg-blue-500 scale-110 shadow-lg shadow-blue-500/50'
                : realtime.isSpeaking
                ? 'bg-indigo-500 scale-105 shadow-lg shadow-indigo-500/50'
                : 'bg-green-500'
            }`}
          >
            <MicrophoneIcon className="h-7 w-7 text-white" />
          </div>

          {/* Cancel button - just exit without diary */}
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-gray-400 text-white font-medium hover:bg-gray-500 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
            취소
          </button>

          {/* Generate diary button */}
          <button
            onClick={handleGenerateDiary}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-pastel-purple text-white font-medium hover:bg-pastel-purple-dark transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5" />
            일기 생성
          </button>
        </div>
      )}
    </div>
  )
}
