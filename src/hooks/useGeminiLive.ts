'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { RealtimeConnectionState } from '@/lib/realtime/types'

interface GeminiSession {
  apiKey: string
  voice: string
  instructions: string
}

interface UseGeminiLiveOptions {
  onTranscript?: (text: string, isFinal: boolean) => void
  onAIResponse?: (text: string, isFinal: boolean) => void
  onError?: (error: Error) => void
  onStateChange?: (state: RealtimeConnectionState) => void
}

// Gemini Live API WebSocket client
// API: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent

const GEMINI_LIVE_MODEL = 'gemini-2.5-flash-preview-native-audio-dialog'
const SAMPLE_RATE = 16000 // 16kHz for input
const OUTPUT_SAMPLE_RATE = 24000 // 24kHz for output

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const { onTranscript, onAIResponse, onError, onStateChange } = options

  const [state, setState] = useState<RealtimeConnectionState>('idle')
  const [userTranscript, setUserTranscript] = useState('')
  const [aiTranscript, setAiTranscript] = useState('')

  // Refs
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const isEndingRef = useRef(false)

  // Callback refs
  const onTranscriptRef = useRef(onTranscript)
  const onAIResponseRef = useRef(onAIResponse)
  const onErrorRef = useRef(onError)
  const onStateChangeRef = useRef(onStateChange)

  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  useEffect(() => { onAIResponseRef.current = onAIResponse }, [onAIResponse])
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { onStateChangeRef.current = onStateChange }, [onStateChange])

  const updateState = useCallback((newState: RealtimeConnectionState) => {
    setState(newState)
    onStateChangeRef.current?.(newState)
  }, [])

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      
      // Handle different message types
      if (data.serverContent) {
        const content = data.serverContent
        
        // Model turn (AI speaking)
        if (content.modelTurn) {
          const parts = content.modelTurn.parts || []
          for (const part of parts) {
            if (part.text) {
              setAiTranscript(prev => prev + part.text)
              onAIResponseRef.current?.(part.text, false)
            }
            if (part.inlineData?.mimeType?.includes('audio')) {
              // Handle audio output - decode and play
              playAudioChunk(part.inlineData.data)
            }
          }
        }
        
        // Turn complete
        if (content.turnComplete) {
          const fullText = aiTranscript
          onAIResponseRef.current?.(fullText, true)
          setAiTranscript('')
          updateState('connected')
        }
        
        // Input audio transcription (user speech)
        if (content.inputTranscription) {
          const text = content.inputTranscription.text || ''
          setUserTranscript(text)
          onTranscriptRef.current?.(text, content.inputTranscription.finished || false)
        }
      }
      
      // Setup complete
      if (data.setupComplete) {
        console.log('[useGeminiLive] Setup complete')
        updateState('connected')
      }
      
      // Error
      if (data.error) {
        console.error('[useGeminiLive] Error:', data.error)
        onErrorRef.current?.(new Error(data.error.message || 'Gemini Live error'))
        updateState('error')
      }
    } catch (e) {
      console.error('[useGeminiLive] Failed to parse message:', e)
    }
  }, [aiTranscript, updateState])

  // Play audio chunk (base64 encoded)
  const playAudioChunk = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) return
    
    try {
      const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))
      const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length / 2, OUTPUT_SAMPLE_RATE)
      const channelData = audioBuffer.getChannelData(0)
      
      // Convert 16-bit PCM to float
      const dataView = new DataView(audioData.buffer)
      for (let i = 0; i < audioData.length / 2; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768
      }
      
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start()
      
      updateState('speaking')
      source.onended = () => updateState('connected')
    } catch (e) {
      console.error('[useGeminiLive] Failed to play audio:', e)
    }
  }, [updateState])

  // Connect to Gemini Live API
  const connect = useCallback(async (session: GeminiSession) => {
    if (state === 'connecting' || state === 'connected') return
    
    isEndingRef.current = false
    updateState('connecting')
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      mediaStreamRef.current = stream
      
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      
      // Connect WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${session.apiKey}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('[useGeminiLive] WebSocket connected')
        
        // Send setup message
        const setupMessage = {
          setup: {
            model: `models/${GEMINI_LIVE_MODEL}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: session.voice || 'Puck'
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{ text: session.instructions }]
            }
          }
        }
        ws.send(JSON.stringify(setupMessage))
      }
      
      ws.onmessage = handleMessage
      
      ws.onerror = (error) => {
        console.error('[useGeminiLive] WebSocket error:', error)
        onErrorRef.current?.(new Error('WebSocket connection error'))
        updateState('error')
      }
      
      ws.onclose = () => {
        console.log('[useGeminiLive] WebSocket closed')
        if (!isEndingRef.current) {
          updateState('idle')
        }
      }
      
      // Start capturing audio after setup
      await setupAudioCapture(stream)
      
    } catch (error) {
      console.error('[useGeminiLive] Connect error:', error)
      onErrorRef.current?.(error instanceof Error ? error : new Error('Failed to connect'))
      updateState('error')
    }
  }, [state, handleMessage, updateState])

  // Setup audio capture and send to WebSocket
  const setupAudioCapture = useCallback(async (stream: MediaStream) => {
    if (!audioContextRef.current || !wsRef.current) return
    
    const source = audioContextRef.current.createMediaStreamSource(stream)
    
    // Use ScriptProcessor for audio capture (AudioWorklet would be better but more complex)
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)
    
    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      if (isEndingRef.current) return
      
      const inputData = e.inputBuffer.getChannelData(0)
      
      // Convert float to 16-bit PCM
      const pcmData = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
      }
      
      // Convert to base64
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)))
      
      // Send audio chunk
      const audioMessage = {
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: base64Audio
          }]
        }
      }
      wsRef.current.send(JSON.stringify(audioMessage))
      
      updateState('listening')
    }
    
    source.connect(processor)
    processor.connect(audioContextRef.current.destination)
    workletNodeRef.current = processor as unknown as AudioWorkletNode
  }, [updateState])

  // Disconnect
  const disconnect = useCallback(async () => {
    isEndingRef.current = true
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    // Stop audio capture
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    updateState('idle')
  }, [updateState])

  // Start conversation (send greeting prompt)
  const startConversation = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    
    // Send a text prompt to start the conversation
    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text: '안녕하세요! 오늘 하루 어떠셨어요?' }]
        }],
        turnComplete: true
      }
    }
    wsRef.current.send(JSON.stringify(message))
    updateState('processing')
  }, [updateState])

  // End conversation
  const endConversation = useCallback(async () => {
    await disconnect()
  }, [disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isEndingRef.current = true
      disconnect()
    }
  }, [disconnect])

  return {
    state,
    connect,
    disconnect,
    startConversation,
    endConversation,
    userTranscript,
    aiTranscript,
    isConnected: state === 'connected' || state === 'listening' || state === 'speaking',
    isListening: state === 'listening',
  }
}
