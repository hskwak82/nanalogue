'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { RealtimeVoice } from '@/lib/realtime/types'

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

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // Check browser support
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'RTCPeerConnection' in window &&
      'mediaDevices' in navigator &&
      'getUserMedia' in navigator.mediaDevices

    setIsSupported(supported)
  }, [])

  // Update state with callback
  const updateState = useCallback(
    (newState: RealtimeState) => {
      setState(newState)
      onStateChange?.(newState)
    },
    [onStateChange]
  )

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

  // Initialize WebRTC connection
  const connect = useCallback(async () => {
    // Prevent duplicate connections
    if (peerConnectionRef.current || state === 'connecting') {
      console.log('Already connecting or connected')
      return
    }

    if (!isSupported) {
      onError?.(new Error('WebRTC is not supported in this browser'))
      return
    }

    try {
      updateState('connecting')

      // Get ephemeral token
      const session = await getSession()

      // Create peer connection
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc

      // Set up audio element for AI responses
      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioElementRef.current = audioEl

      // Handle incoming audio track
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0]
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      mediaStreamRef.current = stream

      // Add audio track to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc

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
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
              input_audio_transcription: {
                model: 'whisper-1',
              },
            },
          })
        )
        updateState('connected')

        // AI greets first
        setTimeout(() => {
          if (dc.readyState === 'open') {
            dc.send(
              JSON.stringify({
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio'],
                  instructions: '사용자에게 따뜻하게 인사하고, 오늘 하루 어땠는지 물어봐주세요. 한국어로 짧게 인사해주세요.',
                },
              })
            )
          }
        }, 500)
      }

      dc.onmessage = (event) => {
        handleServerEvent(JSON.parse(event.data))
      }

      dc.onerror = (error) => {
        console.error('Data channel error:', error)
        onError?.(new Error('Data channel error'))
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
      onError?.(error instanceof Error ? error : new Error('Connection failed'))
      updateState('error')
      disconnect()
    }
  }, [isSupported, getSession, onError, updateState])

  // Handle server events
  const handleServerEvent = useCallback(
    (event: Record<string, unknown>) => {
      const eventType = event.type as string

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
          setUserTranscript(userText)
          onTranscript?.(userText, true)
          // Check for end command keywords
          if (userText && containsEndCommand(userText)) {
            onEndCommand?.()
          }
          break

        case 'response.audio_transcript.delta':
          const delta = (event as { delta?: string }).delta || ''
          setAiTranscript((prev) => prev + delta)
          break

        case 'response.audio_transcript.done':
          const fullText = (event as { transcript?: string }).transcript || ''
          setAiTranscript(fullText)
          onAIResponse?.(fullText)
          break

        case 'response.audio.delta':
          updateState('speaking')
          break

        case 'response.done':
          updateState('connected')
          setAiTranscript('')
          break

        case 'error':
          const errorEvent = event as { error?: { message?: string } }
          console.error('Server error:', errorEvent.error)
          onError?.(new Error(errorEvent.error?.message || 'Server error'))
          break

        default:
          // Log unknown events for debugging
          if (eventType && !eventType.includes('delta')) {
            console.log('Unhandled event:', eventType)
          }
      }
    },
    [onTranscript, onAIResponse, onError, updateState, onEndCommand]
  )

  // Disconnect and cleanup
  const disconnect = useCallback(() => {
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

    // Remove audio element
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null
      audioElementRef.current = null
    }

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

  // Cleanup on unmount - use ref to avoid dependency issues
  useEffect(() => {
    return () => {
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
      // Remove audio element
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = null
        audioElementRef.current = null
      }
    }
  }, [])

  return {
    state,
    isSupported,
    isConnected: state !== 'idle' && state !== 'error',
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    userTranscript,
    aiTranscript,
    connect,
    disconnect,
    sendMessage,
    interrupt,
  }
}
