'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { RealtimeVoice } from '@/lib/realtime/types'
import {
  registerPeerConnection,
  registerAudioElement,
  registerMediaStream,
  registerDataChannel,
  cleanupWebRTC,
  isConnectionBlocked,
} from '@/lib/webrtc-cleanup'

interface RealtimeSession {
  token: string
  expiresAt: number
  voice: RealtimeVoice
  instructions: string
}

interface UseRealtimeVoiceOptions {
  onTranscript?: (text: string, isFinal: boolean) => void
  onAIResponse?: (text: string) => void
  onError?: (error: Error) => void
  onStateChange?: (state: RealtimeState) => void
  onEndCommand?: () => void
}

// Keywords that trigger end conversation
const END_COMMAND_KEYWORDS = [
  '대화 종료',
  '대화종료',
  '대화 끝',
  '대화를 종료',
  '대화를 끝',
  '이만 끝',
  '이만 종료',
  '그만할게',
  '그만할래',
  '끝낼게',
  '끝낼래',
  '종료할게',
  '종료할래',
  '여기까지',
  '마무리',
]

export type RealtimeState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error'

// Check if text contains end command keywords
function containsEndCommand(text: string): boolean {
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim()
  return END_COMMAND_KEYWORDS.some((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  )
}

export function useRealtimeVoice(options: UseRealtimeVoiceOptions = {}) {
  const { onTranscript, onAIResponse, onError, onStateChange, onEndCommand } = options

  const [state, setState] = useState<RealtimeState>('idle')
  const [isSupported, setIsSupported] = useState(true)
  const [userTranscript, setUserTranscript] = useState('')
  const [aiTranscript, setAiTranscript] = useState('')

  // ========================================
  // REFS FOR CALLBACKS - 항상 최신 버전 유지
  // ========================================
  const onTranscriptRef = useRef(onTranscript)
  const onAIResponseRef = useRef(onAIResponse)
  const onErrorRef = useRef(onError)
  const onStateChangeRef = useRef(onStateChange)
  const onEndCommandRef = useRef(onEndCommand)

  // Keep refs updated
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  useEffect(() => { onAIResponseRef.current = onAIResponse }, [onAIResponse])
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { onStateChangeRef.current = onStateChange }, [onStateChange])
  useEffect(() => { onEndCommandRef.current = onEndCommand }, [onEndCommand])

  // Use ref for isEnding to avoid closure issues in event handlers
  const isEndingRef = useRef(false)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // Check browser support (requires HTTPS or localhost for mediaDevices)
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'RTCPeerConnection' in window &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices !== undefined &&
      typeof navigator.mediaDevices.getUserMedia === 'function'

    setIsSupported(supported)

    if (!supported && typeof window !== 'undefined') {
      // Check if it's a secure context issue
      if (!window.isSecureContext) {
        console.warn('[useRealtimeVoice] Not in secure context. HTTPS required for microphone access.')
      }
    }
  }, [])

  // Update state with callback (uses ref)
  const updateState = useCallback((newState: RealtimeState) => {
    setState(newState)
    onStateChangeRef.current?.(newState)
  }, [])

  // Get ephemeral token from server
  const getSession = useCallback(async (): Promise<RealtimeSession> => {
    const response = await fetch('/api/realtime/session', {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get session')
    }

    return response.json()
  }, [])

  // Handle server events - NO CALLBACK DEPENDENCIES (uses refs)
  const handleServerEvent = useCallback((event: Record<string, unknown>) => {
    const eventType = event.type as string

    // Ignore all events if we're ending the conversation
    if (isEndingRef.current && eventType !== 'error') {
      console.log('[useRealtimeVoice] Ignoring event (ending):', eventType)
      return
    }

    switch (eventType) {
      case 'session.created':
      case 'session.updated':
        console.log('Session event:', eventType)
        break

      case 'input_audio_buffer.speech_started':
        updateState('listening')
        break

      case 'input_audio_buffer.speech_stopped':
        updateState('processing')
        break

      case 'conversation.item.input_audio_transcription.completed':
        const userText = (event as { transcript?: string }).transcript || ''
        console.log('[useRealtimeVoice] Transcription completed:', userText)
        console.log('[useRealtimeVoice] containsEndCommand:', containsEndCommand(userText), 'isEnding:', isEndingRef.current)

        setUserTranscript(userText)
        onTranscriptRef.current?.(userText, true)

        // Check for end command keywords (only if not already ending)
        if (userText && containsEndCommand(userText) && !isEndingRef.current) {
          console.log('[useRealtimeVoice] *** END COMMAND DETECTED ***:', userText)
          isEndingRef.current = true

          // Cancel any ongoing response IMMEDIATELY
          if (dataChannelRef.current?.readyState === 'open') {
            console.log('[useRealtimeVoice] Sending response.cancel')
            dataChannelRef.current.send(
              JSON.stringify({ type: 'response.cancel' })
            )
          }

          // Trigger end callback immediately (uses ref!)
          console.log('[useRealtimeVoice] Triggering onEndCommand callback')
          // No delay - trigger immediately
          onEndCommandRef.current?.()
        }
        break

      case 'response.audio_transcript.delta':
        const delta = (event as { delta?: string }).delta || ''
        setAiTranscript((prev) => prev + delta)
        break

      case 'response.audio_transcript.done':
        const fullText = (event as { transcript?: string }).transcript || ''
        setAiTranscript(fullText)
        onAIResponseRef.current?.(fullText)
        break

      case 'response.audio.delta':
        updateState('speaking')
        break

      case 'response.done':
        updateState('connected')
        setAiTranscript('')
        break

      case 'error':
        const errorEvent = event as { error?: { message?: string; type?: string; code?: string } }
        console.error('Server error:', JSON.stringify(errorEvent.error, null, 2))
        onErrorRef.current?.(new Error(errorEvent.error?.message || errorEvent.error?.type || 'Server error'))
        break

      default:
        // Log unknown events for debugging
        if (eventType && !eventType.includes('delta')) {
          console.log('Unhandled event:', eventType)
        }
    }
  }, [updateState]) // Only depends on updateState which is stable

  // Initialize WebRTC connection
  const connect = useCallback(async () => {
    // Check if connections are blocked (user ended conversation)
    if (isConnectionBlocked()) {
      console.log('[useRealtimeVoice] Connection blocked - user ended conversation')
      return
    }

    // Check if we're in ending state
    if (isEndingRef.current) {
      console.log('[useRealtimeVoice] Connection blocked - ending state')
      return
    }

    // Prevent duplicate connections while connecting
    if (state === 'connecting') {
      console.log('[useRealtimeVoice] Already connecting')
      return
    }

    // Clean up any existing connection first (both local refs and global)
    console.log('Cleaning up existing connections before connecting')
    cleanupWebRTC()

    if (peerConnectionRef.current || audioElementRef.current || mediaStreamRef.current) {
      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      // Close data channel
      if (dataChannelRef.current) {
        dataChannelRef.current.close()
        dataChannelRef.current = null
      }
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      // Stop and remove audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        audioElementRef.current.srcObject = null
        audioElementRef.current = null
      }
    }

    if (!isSupported) {
      onErrorRef.current?.(new Error('WebRTC is not supported in this browser'))
      return
    }

    try {
      updateState('connecting')
      isEndingRef.current = false // Reset ending state for new connection

      // Get ephemeral token
      const session = await getSession()

      // Create peer connection
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc
      registerPeerConnection(pc)

      // Set up audio element for AI responses
      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioEl.style.display = 'none' // Hidden but in DOM for tracking
      document.body.appendChild(audioEl) // Add to DOM so we can find it later
      audioElementRef.current = audioEl
      registerAudioElement(audioEl)

      // Handle incoming audio track
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0]
      }

      // Get microphone access
      // Check if mediaDevices is available (requires HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('마이크 접근이 불가능합니다. HTTPS 연결이 필요합니다.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      mediaStreamRef.current = stream
      registerMediaStream(stream)

      // Add audio track to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc
      registerDataChannel(dc)

      dc.onopen = () => {
        // Send session update with voice and instructions
        dc.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              voice: session.voice,
              instructions: session.instructions,
              turn_detection: {
                type: 'server_vad',
                threshold: 0.6,  // Balance between echo rejection and sensitivity
                prefix_padding_ms: 400,  // More audio context before speech
                silence_duration_ms: 1000,  // 1 second of silence before considering speech ended
              },
              input_audio_transcription: {
                model: 'whisper-1',
                language: 'ko',
              },
            },
          })
        )
        updateState('connected')
        // Connection ready, wait for startConversation() to trigger AI greeting
      }

      // handleServerEvent uses refs, so it's always up-to-date
      dc.onmessage = (event) => {
        handleServerEvent(JSON.parse(event.data))
      }

      dc.onerror = (error) => {
        console.error('Data channel error:', error)
        onErrorRef.current?.(new Error('Data channel error'))
        updateState('error')
      }

      // Create and set local description
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Connect to OpenAI Realtime API
      const baseUrl = 'https://api.openai.com/v1/realtime'
      const model = 'gpt-4o-realtime-preview-2024-12-17'

      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })

      if (!sdpResponse.ok) {
        throw new Error('Failed to connect to OpenAI Realtime API')
      }

      const answerSdp = await sdpResponse.text()
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      })
    } catch (error) {
      console.error('Connection error:', error)
      onErrorRef.current?.(error instanceof Error ? error : new Error('Connection failed'))
      updateState('error')
      disconnect()
    }
  }, [isSupported, getSession, updateState, handleServerEvent])

  // Disconnect and cleanup
  const disconnect = useCallback(() => {
    console.log('[useRealtimeVoice] Disconnecting, isEnding:', isEndingRef.current)

    // Mark as ending to prevent any further processing
    isEndingRef.current = true

    // First, cancel any ongoing AI response via data channel
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        console.log('[useRealtimeVoice] Sending response.cancel')
        dataChannelRef.current.send(
          JSON.stringify({
            type: 'response.cancel',
          })
        )
      } catch (e) {
        console.log('[useRealtimeVoice] Failed to send cancel:', e)
      }
    }

    // Stop audio immediately
    if (audioElementRef.current) {
      console.log('[useRealtimeVoice] Stopping audio element')
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
      audioElementRef.current.srcObject = null
      audioElementRef.current.src = ''
      audioElementRef.current.load()
      audioElementRef.current.remove()
      audioElementRef.current = null
    }

    // Use global cleanup
    console.log('[useRealtimeVoice] Running global cleanup')
    cleanupWebRTC()

    // Also clean up local refs
    // Stop media stream
    if (mediaStreamRef.current) {
      console.log('[useRealtimeVoice] Stopping media stream tracks')
      mediaStreamRef.current.getTracks().forEach((track) => {
        console.log(`[useRealtimeVoice] Stopping track: ${track.kind}, readyState: ${track.readyState}`)
        track.stop()
      })
      mediaStreamRef.current = null
    }

    // Close data channel
    if (dataChannelRef.current) {
      console.log('[useRealtimeVoice] Closing data channel')
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      console.log('[useRealtimeVoice] Closing peer connection')
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    console.log('[useRealtimeVoice] Setting state to idle')
    updateState('idle')
    setUserTranscript('')
    setAiTranscript('')
  }, [updateState])

  // Send text message (for testing or text input)
  const sendMessage = useCallback((text: string) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.warn('Data channel not ready')
      return
    }

    dataChannelRef.current.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text,
            },
          ],
        },
      })
    )

    // Request response
    dataChannelRef.current.send(
      JSON.stringify({
        type: 'response.create',
      })
    )
  }, [])

  // Interrupt AI response (barge-in)
  const interrupt = useCallback(() => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      return
    }

    dataChannelRef.current.send(
      JSON.stringify({
        type: 'response.cancel',
      })
    )
  }, [])

  // Start conversation - trigger AI greeting
  const startConversation = useCallback(() => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.warn('Data channel not ready for conversation start')
      return
    }

    dataChannelRef.current.send(
      JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: '사용자에게 따뜻하게 인사하고, 오늘 하루 어땠는지 물어봐주세요. 한국어로 짧게 인사해주세요.',
        },
      })
    )
  }, [])

  // Cleanup function for both unmount and page unload
  const cleanup = useCallback(() => {
    console.log('[useRealtimeVoice] Cleanup triggered')

    // First, cancel any ongoing AI response via data channel
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        dataChannelRef.current.send(
          JSON.stringify({
            type: 'response.cancel',
          })
        )
      } catch {}
    }

    // Stop audio immediately
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.currentTime = 0
      audioElementRef.current.srcObject = null
      audioElementRef.current.src = ''
      try {
        audioElementRef.current.load()
        audioElementRef.current.remove()
      } catch {}
      audioElementRef.current = null
    }

    // Use global cleanup
    cleanupWebRTC()

    // Also clean up local refs
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    // Close data channel
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close()
      } catch {}
      dataChannelRef.current = null
    }
    // Close peer connection
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close()
      } catch {}
      peerConnectionRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Cleanup on page refresh/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [cleanup])

  return {
    state,
    isSupported,
    isConnected: state !== 'idle' && state !== 'error',
    isReady: state === 'connected',
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    userTranscript,
    aiTranscript,
    connect,
    disconnect,
    startConversation,
    sendMessage,
    interrupt,
  }
}
