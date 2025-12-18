'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRealtimeVoice, type RealtimeState } from '@/hooks/useRealtimeVoice'
import { MicrophoneIcon, StopIcon, PhoneXMarkIcon } from '@heroicons/react/24/solid'
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline'

interface RealtimeSessionProps {
  onComplete?: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void
  autoStart?: boolean
}

interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function RealtimeSession({ onComplete, autoStart = false }: RealtimeSessionProps) {
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([])
  const [currentUserText, setCurrentUserText] = useState('')
  const [currentAIText, setCurrentAIText] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false)
  const [conversationStarted, setConversationStarted] = useState(false)
  const transcriptsEndRef = useRef<HTMLDivElement>(null)
  const handleDisconnectRef = useRef<(() => void) | null>(null)

  // Track if end command was triggered (to prevent double-firing)
  const endCommandTriggered = useRef(false)

  const realtime = useRealtimeVoice({
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        setTranscripts((prev) => [
          ...prev,
          { role: 'user', content: text, timestamp: new Date() },
        ])
        setCurrentUserText('')
      } else {
        setCurrentUserText(text)
      }
    },
    onAIResponse: (text) => {
      if (text.trim()) {
        setTranscripts((prev) => [
          ...prev,
          { role: 'assistant', content: text, timestamp: new Date() },
        ])
      }
      setCurrentAIText('')
    },
    onError: (error) => {
      console.error('Realtime error:', error)
    },
    onStateChange: (state) => {
      console.log('Realtime state:', state)
    },
    onEndCommand: () => {
      // Prevent double-firing
      if (endCommandTriggered.current) return
      endCommandTriggered.current = true

      console.log('End command: AI finished closing message, disconnecting')
      handleDisconnectRef.current?.()
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

  const handleConnect = useCallback(async () => {
    await realtime.connect()
  }, [realtime])

  const handleDisconnect = useCallback(() => {
    // First, interrupt any ongoing AI response
    realtime.interrupt()

    // Then disconnect after a small delay to ensure interrupt is processed
    setTimeout(() => {
      realtime.disconnect()

      // Export conversation
      if (transcripts.length > 0 && onComplete) {
        onComplete(
          transcripts.map((t) => ({
            role: t.role,
            content: t.content,
          }))
        )
      }
    }, 100)
  }, [realtime, transcripts, onComplete])

  // Update ref for voice command callback
  useEffect(() => {
    handleDisconnectRef.current = handleDisconnect
  }, [handleDisconnect])

  // Store disconnect ref for cleanup
  const disconnectRef = useRef(realtime.disconnect)
  useEffect(() => {
    disconnectRef.current = realtime.disconnect
  }, [realtime.disconnect])

  // Cleanup on unmount - disconnect when navigating away
  useEffect(() => {
    return () => {
      disconnectRef.current()
    }
  }, [])

  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted)
    // TODO: Actually mute the microphone stream
  }, [isMuted])

  // Auto-connect when autoStart prop is true (connection only, no greeting)
  useEffect(() => {
    if (autoStart && !autoConnectAttempted && realtime.isSupported && realtime.state === 'idle') {
      setAutoConnectAttempted(true)
      realtime.connect()
    }
  }, [autoStart, autoConnectAttempted, realtime])

  // Handle start conversation button click
  const handleStartConversation = useCallback(() => {
    setConversationStarted(true)
    realtime.startConversation()
  }, [realtime])

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
        {/* State 1: Not connected yet - show connecting message */}
        {!realtime.isConnected && realtime.state === 'connecting' && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center animate-pulse">
              <MicrophoneIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              연결 중...
            </h2>
            <p className="text-gray-500">
              잠시만 기다려주세요.
            </p>
          </div>
        )}

        {/* State 2: Not connected, idle - show initial message */}
        {!realtime.isConnected && realtime.state === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pastel-purple to-pastel-pink flex items-center justify-center">
              <MicrophoneIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              실시간 음성 대화
            </h2>
            <p className="text-gray-500 max-w-sm">
              마이크 버튼을 눌러 자연스러운 대화를 시작하세요.
              AI가 실시간으로 응답합니다.
            </p>
          </div>
        )}

        {/* State 3: Connected but conversation not started - show start button */}
        {realtime.isReady && !conversationStarted && transcripts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <MicrophoneIcon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                준비 완료!
              </h2>
              <p className="text-gray-500 mb-6">
                버튼을 누르면 AI가 대화를 시작해요.
              </p>
              <button
                onClick={handleStartConversation}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-pastel-purple to-pastel-pink text-white font-medium shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                대화 시작
              </button>
            </div>
          </div>
        )}

        {/* State 4: Conversation started but no messages yet */}
        {conversationStarted && transcripts.length === 0 && realtime.isConnected && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center animate-pulse">
              <MicrophoneIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              AI가 말하고 있어요...
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

        {/* Current User Speech (interim) */}
        {currentUserText && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3 bg-pastel-purple/70 text-white">
              <p className="whitespace-pre-wrap">{currentUserText}</p>
              <p className="text-xs mt-1 text-pastel-purple-light">말하는 중...</p>
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
        <div className="flex items-center justify-center gap-4 px-4 py-6 bg-white border-t">
          {/* Visual indicator of listening state */}
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              realtime.isListening
                ? 'bg-blue-500 scale-110 shadow-lg shadow-blue-500/50'
                : realtime.isSpeaking
                ? 'bg-indigo-500 scale-105 shadow-lg shadow-indigo-500/50'
                : 'bg-green-500'
            }`}
          >
            <MicrophoneIcon className="h-8 w-8 text-white" />
          </div>

          {/* End conversation button */}
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
          >
            <PhoneXMarkIcon className="h-5 w-5" />
            대화 종료
          </button>
        </div>
      )}

      {/* Tips - only show when conversation has started */}
      {conversationStarted && realtime.isConnected && (
        <div className="px-4 py-2 bg-blue-50 text-center">
          <p className="text-xs text-blue-600">
            💡 AI가 말하는 중에도 끼어들 수 있어요. &quot;대화 종료&quot;, &quot;마무리&quot;라고 말하면 대화가 끝나요!
          </p>
        </div>
      )}
    </div>
  )
}
