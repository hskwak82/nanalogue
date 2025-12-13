'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Check TTS support (client-side only)
function checkTTSSupport(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Remove emojis from text for cleaner TTS
function removeEmojis(text: string): string {
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim()
}

// Check STT support (client-side only)
function checkSTTSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
}

// TTS Hook - Text to Speech
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback(
    (text: string) => {
      if (!checkTTSSupport() || !isEnabled) return

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      // Remove emojis for cleaner speech
      const cleanText = removeEmojis(text)
      if (!cleanText) return

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = 'ko-KR'
      utterance.rate = 1.0
      utterance.pitch = 1.0

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [isEnabled]
  )

  const stop = useCallback(() => {
    if (checkTTSSupport()) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev)
  }, [])

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isEnabled,
    isSupported: checkTTSSupport(),
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
