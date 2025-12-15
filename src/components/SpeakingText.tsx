'use client'

interface SpeakingTextProps {
  text: string
  progress: number // 0 to 1
  isSpeaking: boolean
}

export function SpeakingText({ text, progress, isSpeaking }: SpeakingTextProps) {
  // If not speaking, show all text clearly
  if (!isSpeaking) {
    return <span>{text}</span>
  }

  // Calculate split point based on progress
  const splitIndex = Math.floor(text.length * progress)
  const spokenText = text.slice(0, splitIndex)
  const unspokenText = text.slice(splitIndex)

  return (
    <span>
      <span className="text-gray-700">{spokenText}</span>
      <span className="text-gray-300 transition-colors duration-100">{unspokenText}</span>
    </span>
  )
}
