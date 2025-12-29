'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { RealtimeProviderId, RealtimeConnectionState } from '@/lib/realtime/types'
import {
  registerPeerConnection,
  registerAudioElement,
  registerMediaStream,
  registerDataChannel,
  cleanupWebRTC,
  isConnectionBlocked,
} from '@/lib/webrtc-cleanup'

interface SessionResponse {
  provider: RealtimeProviderId
  // OpenAI
  token?: string
  expiresAt?: number
  // Gemini
  apiKey?: string
  // Common
  voice: string
  instructions: string
}

interface UseRealtimeProviderOptions {
  onTranscript?: (text: string, isFinal: boolean) => void
  onAIResponse?: (text: string) => void
  onError?: (error: Error) => void
  onStateChange?: (state: RealtimeConnectionState) => void
}

// Constants for audio processing
const GEMINI_INPUT_SAMPLE_RATE = 16000 // 16kHz for Gemini input
const GEMINI_OUTPUT_SAMPLE_RATE = 24000 // 24kHz for Gemini output
const GEMINI_LIVE_MODEL = 'gemini-2.0-flash-exp'

export function useRealtimeProvider(options: UseRealtimeProviderOptions = {}) {
  const { onTranscript, onAIResponse, onError, onStateChange } = options

  const [state, setState] = useState<RealtimeConnectionState>('idle')
  const [provider, setProvider] = useState<RealtimeProviderId | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [userTranscript, setUserTranscript] = useState('')
  const [aiTranscript, setAiTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(256).fill(0))

  // Callback refs
  const onTranscriptRef = useRef(onTranscript)
  const onAIResponseRef = useRef(onAIResponse)
  const onErrorRef = useRef(onError)
  const onStateChangeRef = useRef(onStateChange)

  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  useEffect(() => { onAIResponseRef.current = onAIResponse }, [onAIResponse])
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { onStateChangeRef.current = onStateChange }, [onStateChange])

  // Shared refs
  const isEndingRef = useRef(false)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // OpenAI-specific refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  // Gemini-specific refs
  const wsRef = useRef<WebSocket | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)

  // Browser support check
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices !== undefined &&
      typeof navigator.mediaDevices.getUserMedia === 'function'

    setIsSupported(supported)
  }, [])

  const updateState = useCallback((newState: RealtimeConnectionState) => {
    setState(newState)
    onStateChangeRef.current?.(newState)
  }, [])

  // Get session from server
  const getSession = useCallback(async (): Promise<SessionResponse> => {
    const response = await fetch('/api/realtime/session', { method: 'POST' })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get session')
    }
    return response.json()
  }, [])

  // ========================================
  // OpenAI WebRTC Implementation
  // ========================================

  const handleOpenAIServerEvent = useCallback((event: Record<string, unknown>) => {
    const eventType = event.type as string

    if (isEndingRef.current && eventType !== 'error') return

    switch (eventType) {
      case 'session.created':
      case 'session.updated':
        break

      case 'input_audio_buffer.speech_started':
        updateState('listening')
        onTranscriptRef.current?.('', false)
        break

      case 'input_audio_buffer.speech_stopped':
        updateState('processing')
        break

      case 'conversation.item.input_audio_transcription.completed':
        const userText = (event as { transcript?: string }).transcript || ''
        setUserTranscript(userText)
        onTranscriptRef.current?.(userText, true)
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
        setAiTranscript('')
        updateState('connected')
        break

      case 'error':
        const errorEvent = event as { error?: { message?: string; type?: string; code?: string } }
        if (errorEvent.error?.code === 'conversation_already_has_active_response') break
        console.error('OpenAI server error:', errorEvent.error)
        onErrorRef.current?.(new Error(errorEvent.error?.message || 'Server error'))
        break
    }
  }, [updateState])

  const connectOpenAI = useCallback(async (session: SessionResponse) => {
    if (!session.token) throw new Error('OpenAI token is missing')

    // Create peer connection
    const pc = new RTCPeerConnection()
    peerConnectionRef.current = pc
    registerPeerConnection(pc)

    // Audio element for AI responses
    const audioEl = document.createElement('audio')
    audioEl.autoplay = true
    audioEl.style.display = 'none'
    document.body.appendChild(audioEl)
    audioElementRef.current = audioEl
    registerAudioElement(audioEl)

    pc.ontrack = (event) => {
      audioEl.srcObject = event.streams[0]
    }

    if (isEndingRef.current || isConnectionBlocked()) {
      pc.close()
      audioEl.remove()
      return
    }

    // Get microphone
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    if (isEndingRef.current || isConnectionBlocked()) {
      stream.getTracks().forEach(track => track.stop())
      pc.close()
      audioEl.remove()
      return
    }

    mediaStreamRef.current = stream
    registerMediaStream(stream)

    // Setup audio analyzer
    setupAudioAnalyzer(stream)

    // Add tracks
    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    // Create data channel
    const dc = pc.createDataChannel('oai-events')
    dataChannelRef.current = dc
    registerDataChannel(dc)

    dc.onopen = () => {
      dc.send(JSON.stringify({
        type: 'session.update',
        session: {
          voice: session.voice,
          instructions: session.instructions,
          turn_detection: {
            type: 'server_vad',
            threshold: 0.6,
            prefix_padding_ms: 400,
            silence_duration_ms: 1000,
          },
          input_audio_transcription: {
            model: 'whisper-1',
            language: 'ko',
          },
        },
      }))
      updateState('connected')
    }

    dc.onmessage = (event) => handleOpenAIServerEvent(JSON.parse(event.data))
    dc.onerror = () => {
      onErrorRef.current?.(new Error('Data channel error'))
      updateState('error')
    }

    if (isEndingRef.current || isConnectionBlocked()) {
      stream.getTracks().forEach(track => track.stop())
      pc.close()
      audioEl.remove()
      return
    }

    // SDP exchange
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const sdpResponse = await fetch(
      `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      }
    )

    if (!sdpResponse.ok) throw new Error('Failed to connect to OpenAI Realtime API')

    if (isEndingRef.current || isConnectionBlocked()) {
      stream.getTracks().forEach(track => track.stop())
      pc.close()
      audioEl.remove()
      return
    }

    const answerSdp = await sdpResponse.text()
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
  }, [handleOpenAIServerEvent, updateState])

  // ========================================
  // Gemini WebSocket Implementation
  // ========================================

  // Audio queue for sequential playback
  const audioQueueRef = useRef<AudioBuffer[]>([])
  const isPlayingRef = useRef(false)

  // Accumulated transcripts (use refs to avoid stale closures)
  const accumulatedAiTextRef = useRef('')
  const accumulatedUserTextRef = useRef('')

  const playNextInQueue = useCallback(() => {
    if (!playbackContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      if (!isEndingRef.current) updateState('connected')
      return
    }

    isPlayingRef.current = true
    const audioBuffer = audioQueueRef.current.shift()!
    const source = playbackContextRef.current.createBufferSource()
    source.buffer = audioBuffer
    source.connect(playbackContextRef.current.destination)
    source.onended = playNextInQueue
    source.start()
  }, [updateState])

  const playGeminiAudioChunk = useCallback(async (base64Audio: string) => {
    if (!playbackContextRef.current) {
      // Gemini outputs 24kHz PCM audio
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 })
    }

    try {
      const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))

      // Check if data is large enough for 16-bit PCM (at least 2 bytes)
      if (audioData.length < 2) {
        return
      }

      // Number of 16-bit samples
      const numSamples = Math.floor(audioData.length / 2)

      // Gemini outputs 24kHz 16-bit PCM little-endian mono
      const audioBuffer = playbackContextRef.current.createBuffer(1, numSamples, 24000)
      const channelData = audioBuffer.getChannelData(0)

      // Create DataView with proper offset handling
      const dataView = new DataView(audioData.buffer, audioData.byteOffset, audioData.byteLength)
      for (let i = 0; i < numSamples; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768
      }

      // Queue audio for sequential playback
      audioQueueRef.current.push(audioBuffer)

      if (!isPlayingRef.current) {
        playNextInQueue()
      }
    } catch (e) {
      console.error('[Gemini] Failed to play audio:', e)
    }
  }, [playNextInQueue])

  const handleGeminiMessage = useCallback(async (event: MessageEvent) => {
    // Ignore messages if we're ending the connection
    if (isEndingRef.current) return

    try {
      let data: Record<string, unknown>

      // Handle Blob messages (Gemini sends JSON as Blob sometimes)
      if (event.data instanceof Blob) {
        const text = await event.data.text()
        if (!text || !text.startsWith('{')) {
          // Raw audio data or empty - ignore
          return
        }
        data = JSON.parse(text)
      } else if (typeof event.data === 'string') {
        data = JSON.parse(event.data)
      } else {
        console.warn('[Gemini] Unknown message type:', typeof event.data)
        return
      }

      // Handle serverContent
      if (data.serverContent) {
        const content = data.serverContent as Record<string, unknown>

        // Model turn (AI response with audio) - this means user stopped speaking
        if (content.modelTurn) {
          // Finalize user transcript if there's pending text
          if (accumulatedUserTextRef.current) {
            onTranscriptRef.current?.(accumulatedUserTextRef.current, true)
            accumulatedUserTextRef.current = ''
            setUserTranscript('')
          }

          const modelTurn = content.modelTurn as { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> }
          for (const part of modelTurn.parts || []) {
            if (part.inlineData?.mimeType?.includes('audio') && part.inlineData?.data) {
              updateState('speaking')
              playGeminiAudioChunk(part.inlineData.data)
            }
          }
        }

        // Output transcription (AI speech to text) - Gemini sends incremental text
        if (content.outputTranscription) {
          const outputTrans = content.outputTranscription as { text?: string }
          if (outputTrans.text) {
            // Append incremental text
            accumulatedAiTextRef.current += outputTrans.text
            setAiTranscript(accumulatedAiTextRef.current)
          }
        }

        // Input transcription (User speech to text) - Gemini sends incremental text
        if (content.inputTranscription) {
          const inputTrans = content.inputTranscription as { text?: string; finished?: boolean }
          if (inputTrans.text) {
            // Append incremental text
            accumulatedUserTextRef.current += inputTrans.text
            setUserTranscript(accumulatedUserTextRef.current)
            onTranscriptRef.current?.(accumulatedUserTextRef.current, inputTrans.finished || false)
          }
          if (inputTrans.finished) {
            // Clear for next turn after sending final
            accumulatedUserTextRef.current = ''
            setUserTranscript('')
            updateState('processing')
          }
        }

        // Turn complete
        if (content.turnComplete) {
          // Save final AI response
          if (accumulatedAiTextRef.current) {
            onAIResponseRef.current?.(accumulatedAiTextRef.current)
          }
          // Clear for next turn
          accumulatedAiTextRef.current = ''
          setAiTranscript('')
          updateState('connected')
        }

        // Interrupted by user - AI was speaking and user started talking
        if (content.interrupted) {
          console.log('[Gemini] Interrupted by user - stopping AI playback')
          // Stop current playback
          audioQueueRef.current = []
          isPlayingRef.current = false
          // Keep accumulated text for history, just clear current display
          if (accumulatedAiTextRef.current) {
            onAIResponseRef.current?.(accumulatedAiTextRef.current)
          }
          accumulatedAiTextRef.current = ''
          setAiTranscript('')
          // Don't change state here - let the next inputTranscription handle it
        }
      }

      // Setup complete
      if (data.setupComplete) {
        console.log('[Gemini] Setup complete')
        updateState('connected')
      }

      // Error
      if (data.error) {
        const error = data.error as { message?: string }
        console.error('[Gemini] Error:', error)
        onErrorRef.current?.(new Error(error.message || 'Gemini Live error'))
        updateState('error')
      }
    } catch (e) {
      console.error('[Gemini] Failed to parse message:', e)
    }
  }, [playGeminiAudioChunk, updateState])

  // Store session instructions for Gemini startConversation
  const geminiInstructionsRef = useRef<string>('')

  const connectGemini = useCallback(async (session: SessionResponse) => {
    if (!session.apiKey) throw new Error('Gemini API key is missing')

    // Store instructions for later use in startConversation
    geminiInstructionsRef.current = session.instructions

    // Get microphone with Gemini's sample rate
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: GEMINI_INPUT_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      }
    })

    if (isEndingRef.current) {
      stream.getTracks().forEach(track => track.stop())
      return
    }

    mediaStreamRef.current = stream

    // Create audio context for capture
    const audioContext = new AudioContext({ sampleRate: GEMINI_INPUT_SAMPLE_RATE })
    audioContextRef.current = audioContext

    // Setup audio analyzer for visualization
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 8192
    analyser.smoothingTimeConstant = 0.5
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    analyserRef.current = analyser
    startAudioVisualization()

    // Connect WebSocket
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${session.apiKey}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[Gemini] WebSocket connected')

      // Send setup message - Gemini Live API format with system instruction
      const setupMsg = {
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
          // System instruction for diary conversation
          systemInstruction: {
            parts: [{ text: session.instructions }]
          },
          // Enable transcription for both input (user) and output (AI)
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        }
      }
      console.log('[Gemini] Sending setup with systemInstruction')
      ws.send(JSON.stringify(setupMsg))
    }

    ws.onmessage = handleGeminiMessage

    ws.onerror = (error) => {
      console.error('[Gemini] WebSocket error:', error)
      onErrorRef.current?.(new Error('WebSocket connection error'))
      updateState('error')
    }

    ws.onclose = (event) => {
      console.log(`[Gemini] WebSocket closed: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`)
      if (event.code === 1007) {
        console.error('[Gemini] Invalid argument error - check setup message format')
        onErrorRef.current?.(new Error(`Gemini setup error: ${event.reason || 'Invalid argument'}`))
        updateState('error')
      } else if (!isEndingRef.current) {
        updateState('idle')
      }
    }

    // Setup audio capture with ScriptProcessor
    const processor = audioContext.createScriptProcessor(4096, 1, 1)
    scriptProcessorRef.current = processor

    // Track if we've started listening to avoid repeated state updates
    let hasStartedListening = false

    processor.onaudioprocess = (e) => {
      try {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || isEndingRef.current) return

        const inputData = e.inputBuffer.getChannelData(0)

        // Convert float to 16-bit PCM
        const pcmData = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
        }

        // Convert to base64
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)))

        // Send audio chunk
        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: base64Audio
            }]
          }
        }))

        // Only update state once when starting to listen
        if (!hasStartedListening) {
          hasStartedListening = true
          updateState('listening')
        }
      } catch (err) {
        console.error('[Gemini] Audio process error:', err)
      }
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
  }, [handleGeminiMessage, updateState])

  // ========================================
  // Shared Functions
  // ========================================

  const setupAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 8192
      analyser.smoothingTimeConstant = 0.5

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      startAudioVisualization()
    } catch (e) {
      console.warn('Failed to setup audio analyzer:', e)
    }
  }, [])

  const startAudioVisualization = useCallback(() => {
    const updateAudioLevel = () => {
      if (!analyserRef.current || isEndingRef.current) return

      const dataArray = new Uint8Array(analyserRef.current.fftSize)
      analyserRef.current.getByteTimeDomainData(dataArray)

      const samples = 256
      const step = Math.floor(dataArray.length / samples)
      const rawWaveform: number[] = []
      let maxAmplitude = 0

      for (let i = 0; i < samples; i++) {
        const value = dataArray[i * step]
        const normalized = (value - 128) / 128
        rawWaveform.push(normalized)
        maxAmplitude = Math.max(maxAmplitude, Math.abs(normalized))
      }

      const minThreshold = 0.02
      const scaleFactor = maxAmplitude > minThreshold ? 0.9 / maxAmplitude : 1
      const waveform = rawWaveform.map(v => v * scaleFactor)

      setAudioLevel(waveform)
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
    }

    updateAudioLevel()
  }, [])

  // ========================================
  // Public API
  // ========================================

  const connect = useCallback(async () => {
    if (isConnectionBlocked() || state === 'connecting') return

    isEndingRef.current = false
    cleanupWebRTC()

    if (!isSupported) {
      onErrorRef.current?.(new Error('WebRTC/Audio is not supported in this browser'))
      return
    }

    try {
      updateState('connecting')

      const session = await getSession()
      setProvider(session.provider)

      console.log(`[useRealtimeProvider] Connecting with provider: ${session.provider}`)

      if (session.provider === 'gemini') {
        await connectGemini(session)
      } else {
        await connectOpenAI(session)
      }
    } catch (error) {
      console.error('Connection error:', error)
      onErrorRef.current?.(error instanceof Error ? error : new Error('Connection failed'))
      updateState('error')
      disconnect()
    }
  }, [state, isSupported, getSession, connectOpenAI, connectGemini, updateState])

  const disconnect = useCallback(() => {
    console.log('[useRealtimeProvider] Disconnecting')
    isEndingRef.current = true

    // Stop audio visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Close audio contexts
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close().catch(() => {})
      playbackContextRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(new Array(256).fill(0))

    // OpenAI cleanup
    if (dataChannelRef.current?.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }))
      } catch {}
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.srcObject = null
      audioElementRef.current.remove()
      audioElementRef.current = null
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Gemini cleanup
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current = null
    }

    // Shared cleanup
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    cleanupWebRTC()
    updateState('idle')
    setUserTranscript('')
    setAiTranscript('')
  }, [updateState])

  const startConversation = useCallback((imageContext?: string) => {
    if (provider === 'gemini') {
      // Gemini: Send a trigger to start conversation based on system instructions
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

      // If image context is provided, include it in the greeting prompt
      const greetingPrompt = imageContext
        ? `사용자가 오늘의 사진을 공유했습니다. 사진 분석 결과: ${imageContext}\n\n이 사진에 대해 따뜻하게 언급하며 대화를 시작해주세요.`
        : '대화를 시작해주세요.'

      wsRef.current.send(JSON.stringify({
        clientContent: {
          turns: [{
            role: 'user',
            parts: [{ text: greetingPrompt }]
          }],
          turnComplete: true
        }
      }))
      updateState('processing')
    } else {
      // OpenAI: Use data channel
      if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') return

      // If image context is provided, include it in the instructions
      const instructions = imageContext
        ? `사용자가 오늘의 사진을 공유했습니다. 사진 분석 결과: ${imageContext}\n\n이 사진에 대해 따뜻하게 언급하며 인사하고, 사진과 관련된 오늘 하루에 대해 물어봐주세요. 한국어로 짧게 인사해주세요.`
        : '사용자에게 따뜻하게 인사하고, 오늘 하루 어땠는지 물어봐주세요. 한국어로 짧게 인사해주세요.'

      dataChannelRef.current.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions,
        },
      }))
    }
  }, [provider, updateState])

  const sendMessage = useCallback((text: string) => {
    if (provider === 'gemini') {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

      wsRef.current.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true
        }
      }))
    } else {
      if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') return

      dataChannelRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      }))
      dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }))
    }
  }, [provider])

  const interrupt = useCallback(() => {
    if (provider === 'openai') {
      if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') return
      dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }))
    }
    // Gemini doesn't have a cancel mechanism in the same way
  }, [provider])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isEndingRef.current = true
      disconnect()
    }
  }, [disconnect])

  // Cleanup on page refresh
  useEffect(() => {
    const handleBeforeUnload = () => disconnect()
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [disconnect])

  return {
    state,
    provider,
    isSupported,
    isConnected: state !== 'idle' && state !== 'error',
    isReady: state === 'connected',
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    userTranscript,
    aiTranscript,
    audioLevel,
    connect,
    disconnect,
    startConversation,
    sendMessage,
    interrupt,
  }
}
