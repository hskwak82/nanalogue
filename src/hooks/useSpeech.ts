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
  const [progress, setProgress] = useState(0) // 0 to 1 progress through text
  const [currentText, setCurrentText] = useState('') // Currently speaking text
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
      setProgress(0)
      setCurrentText(text)

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

        audio.ontimeupdate = () => {
          // Update progress on every time update (most reliable)
          if (audio.duration && audio.duration > 0) {
            const currentProgress = audio.currentTime / audio.duration
            setProgress(Math.min(currentProgress, 1))
          }
        }
        audio.onplay = () => {
          setIsSpeaking(true)
          setIsLoading(false)
        }
        audio.onended = () => {
          setIsSpeaking(false)
          setProgress(1) // Complete
          audioRef.current = null
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          setIsLoading(false)
          setProgress(0)
          audioRef.current = null
        }

        // Handle autoplay policy - may fail if user hasn't interacted yet
        try {
          await audio.play()
        } catch (playError) {
          // NotAllowedError: user hasn't interacted with the document
          console.warn('Autoplay blocked:', playError)
          setIsLoading(false)
          // Keep audio ready for manual play later
        }
      } catch (error) {
        console.error('TTS Error:', error)
        setIsLoading(false)
        setIsSpeaking(false)
        setProgress(0)
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
    setProgress(0)
  }, [])

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev)
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled)
    if (!enabled) {
      stop()
    }
  }, [stop])

  return {
    speak,
    stop,
    toggle,
    setEnabled,
    isSpeaking,
    isLoading,
    isEnabled,
    isSupported: checkAudioSupport(),
    progress, // 0 to 1 progress through speech
    currentText, // Text currently being spoken
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
  const accumulatedTranscriptRef = useRef('')
  const hasSentRef = useRef(false) // Track if we've already sent to prevent double-send
  const maxFinalTextRef = useRef('') // Track max final text seen (PC: results array may reset)
  const isMobileRef = useRef(false) // Track device type for onend handler

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
    () => {
      clearSilenceTimer()
      silenceTimerRef.current = setTimeout(() => {
        // Auto-stop and send on silence using accumulated transcript
        const fullTranscript = accumulatedTranscriptRef.current.trim()
        if (recognitionRef.current && fullTranscript && !hasSentRef.current) {
          hasSentRef.current = true
          recognitionRef.current.stop()
          setIsListening(false)
          if (onSilenceEndRef.current) {
            onSilenceEndRef.current(fullTranscript)
          }
        }
      }, silenceTimeout)
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

    // Detect mobile device
    const isMobile = typeof navigator !== 'undefined' &&
      (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 'ontouchstart' in window)
    isMobileRef.current = isMobile

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results
      let transcript = ''

      if (isMobile) {
        // Mobile: results are cumulative, just use the last result
        const lastResult = results[results.length - 1]
        transcript = lastResult[0].transcript
        setFinalTranscript(lastResult.isFinal ? transcript : '')
      } else {
        // Desktop: results are segments, concatenate all finals + all interims
        // Browser may reset results array between segments, so we track max final text
        let currentFinalText = ''
        let interimText = ''

        for (let i = 0; i < results.length; i++) {
          if (results[i].isFinal) {
            currentFinalText += results[i][0].transcript
          } else {
            interimText += results[i][0].transcript
          }
        }

        // Keep the maximum final text we've seen (prevents losing text on array reset)
        if (currentFinalText.length >= maxFinalTextRef.current.length) {
          maxFinalTextRef.current = currentFinalText
        }

        transcript = maxFinalTextRef.current + interimText
        setFinalTranscript(maxFinalTextRef.current)
      }

      setTranscript(transcript)
      accumulatedTranscriptRef.current = transcript

      // Reset silence timer on any speech activity
      if (transcript.trim()) {
        startSilenceTimer()
      }
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)

      // On mobile, recognition may auto-stop on silence before our timer fires
      // Instead of sending immediately, wait for the silence timeout
      const fullTranscript = accumulatedTranscriptRef.current.trim()
      if (fullTranscript && !hasSentRef.current) {
        if (isMobileRef.current) {
          // Mobile: Start/continue silence timer - gives user time to tap mic to continue
          // Don't clear existing timer, let it continue counting
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (!hasSentRef.current) {
                hasSentRef.current = true
                if (onSilenceEndRef.current) {
                  onSilenceEndRef.current(accumulatedTranscriptRef.current.trim())
                }
              }
            }, silenceTimeout)
          }
        } else {
          // PC: Send immediately on recognition end
          clearSilenceTimer()
          hasSentRef.current = true
          if (onSilenceEndRef.current) {
            onSilenceEndRef.current(fullTranscript)
          }
        }
      } else {
        clearSilenceTimer()
      }
    }

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" and "aborted" are expected scenarios, not errors
      if (event.error === 'no-speech' || event.error === 'aborted') {
        console.log('Speech recognition ended:', event.error)
      } else {
        console.error('Speech recognition error:', event.error)
      }
      setIsListening(false)
      clearSilenceTimer()
    }

    return () => {
      clearSilenceTimer()
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [startSilenceTimer, clearSilenceTimer, silenceTimeout])

  const startListening = useCallback(() => {
    if (!checkSTTSupport() || !recognitionRef.current) return

    setTranscript('')
    setFinalTranscript('')
    accumulatedTranscriptRef.current = ''
    maxFinalTextRef.current = ''
    hasSentRef.current = false
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
    accumulatedTranscriptRef.current = ''
    maxFinalTextRef.current = ''
  }, [])

  // Check if the transcript was already sent (for external use)
  const wasSent = useCallback(() => hasSentRef.current, [])

  return {
    startListening,
    stopListening,
    resetTranscript,
    isListening,
    transcript,
    finalTranscript,
    isSupported: checkSTTSupport(),
    wasSent,
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
