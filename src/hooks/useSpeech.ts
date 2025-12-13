'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Check if Audio is supported
function checkAudioSupport(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

// Check STT support (client-side only)
function checkSTTSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
}

// TTS Hook - Google Cloud Text to Speech
interface UseTTSOptions {
  voice?: string
}

export function useTTS(options: UseTTSOptions = {}) {
  const { voice } = options
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const speak = useCallback(
    async (text: string) => {
      if (!checkAudioSupport() || !isEnabled || !text.trim()) return

      // Stop any ongoing playback
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      setIsLoading(true)

      try {
        // Call Google Cloud TTS API
        const response = await fetch('/api/audio/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice }),
        })

        if (!response.ok) {
          throw new Error('TTS API failed')
        }

        const data = await response.json()

        // Create audio from base64
        const audioData = `data:audio/mp3;base64,${data.audio}`
        const audio = new Audio(audioData)
        audioRef.current = audio

        audio.onplay = () => {
          setIsSpeaking(true)
          setIsLoading(false)
        }
        audio.onended = () => {
          setIsSpeaking(false)
          audioRef.current = null
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          setIsLoading(false)
          audioRef.current = null
        }

        await audio.play()
      } catch (error) {
        console.error('TTS Error:', error)
        setIsLoading(false)
        setIsSpeaking(false)
      }
    },
    [isEnabled, voice]
  )

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
    setIsLoading(false)
  }, [])

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev)
  }, [])

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isLoading,
    isEnabled,
    isSupported: checkAudioSupport(),
  }
}

// STT Hook - Speech to Text with auto-send on silence
interface UseSTTOptions {
  silenceTimeout?: number // ms to wait after last speech before triggering onSilence
  onSilenceEnd?: (transcript: string) => void // callback when silence detected
}

export function useSTT(options: UseSTTOptions = {}) {
  const { silenceTimeout = 2000, onSilenceEnd } = options
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const onSilenceEndRef = useRef(onSilenceEnd)

  // Keep callback ref updated
  useEffect(() => {
    onSilenceEndRef.current = onSilenceEnd
  }, [onSilenceEnd])

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  // Start silence timer
  const startSilenceTimer = useCallback(
    (currentTranscript: string) => {
      clearSilenceTimer()
      if (currentTranscript.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          // Auto-stop and send on silence
          if (recognitionRef.current && currentTranscript.trim()) {
            recognitionRef.current.stop()
            setIsListening(false)
            if (onSilenceEndRef.current) {
              onSilenceEndRef.current(currentTranscript.trim())
            }
          }
        }, silenceTimeout)
      }
    },
    [silenceTimeout, clearSilenceTimer]
  )

  useEffect(() => {
    if (!checkSTTSupport()) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.lang = 'ko-KR'
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      const currentTranscript = final || interim
      setTranscript(currentTranscript)
      if (final) {
        setFinalTranscript((prev) => prev + final)
      }

      // Reset silence timer on new speech
      startSilenceTimer(currentTranscript)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
      clearSilenceTimer()
    }

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      clearSilenceTimer()
    }

    return () => {
      clearSilenceTimer()
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [startSilenceTimer, clearSilenceTimer])

  const startListening = useCallback(() => {
    if (!checkSTTSupport() || !recognitionRef.current) return

    setTranscript('')
    setFinalTranscript('')
    setIsListening(true)
    recognitionRef.current.start()
  }, [])

  const stopListening = useCallback(() => {
    clearSilenceTimer()
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [clearSilenceTimer])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setFinalTranscript('')
  }, [])

  return {
    startListening,
    stopListening,
    resetTranscript,
    isListening,
    transcript,
    finalTranscript,
    isSupported: checkSTTSupport(),
  }
}

// Type declarations for Web Speech API
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
  const SpeechRecognition: SpeechRecognitionConstructor
}
