'use client'

import { useState, useEffect } from 'react'

interface VoiceInputProps {
  isListening: boolean
  isSupported: boolean
  disabled?: boolean
  onToggle: () => void
}

export function VoiceInput({
  isListening,
  isSupported,
  disabled = false,
  onToggle,
}: VoiceInputProps) {
  // Always render a placeholder on server, real content on client
  // This prevents hydration mismatch
  const [isClient, setIsClient] = useState(false)

  // Standard pattern for hydration fix in Next.js
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setIsClient(true), [])

  // Show placeholder until we know we're on the client
  if (!isClient) {
    return <div className="w-11 h-11" /> // Placeholder to prevent layout shift
  }

  if (!isSupported) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`rounded-full p-3 transition-all ${
        isListening
          ? 'bg-red-500 text-white animate-pulse hover:bg-red-600'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
      } disabled:cursor-not-allowed disabled:opacity-50`}
      title={isListening ? '녹음 중지' : '음성으로 입력'}
    >
      {isListening ? (
        // Stop icon
        <svg
          className="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        // Microphone icon
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </button>
  )
}

// Speaker toggle button for TTS
interface SpeakerToggleProps {
  isEnabled: boolean
  isSupported: boolean
  isSpeaking?: boolean
  onToggle: () => void
}

export function SpeakerToggle({
  isEnabled,
  isSupported,
  isSpeaking = false,
  onToggle,
}: SpeakerToggleProps) {
  const [isClient, setIsClient] = useState(false)

  // Standard pattern for hydration fix in Next.js
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setIsClient(true), [])

  // Show placeholder until we know we're on the client
  if (!isClient) {
    return <div className="w-9 h-9" /> // Placeholder
  }

  if (!isSupported) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-lg p-2 transition-all ${
        isEnabled
          ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      } ${isSpeaking ? 'animate-pulse' : ''}`}
      title={isEnabled ? '음성 자동재생 끄기' : '음성 자동재생 켜기'}
    >
      {isEnabled ? (
        // Speaker on icon
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      ) : (
        // Speaker off icon
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      )}
    </button>
  )
}

// Play button for individual messages
interface PlayButtonProps {
  isPlaying: boolean
  onClick: () => void
}

export function PlayButton({ isPlaying, onClick }: PlayButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      title={isPlaying ? '정지' : '재생'}
    >
      {isPlaying ? (
        // Stop icon
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        // Play icon
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  )
}
