'use client'

import { useState, useRef, useCallback } from 'react'

interface SessionImageOpacityControlProps {
  entryId: string
  initialOpacity: number
  onOpacityChange?: (opacity: number) => void
}

export function SessionImageOpacityControl({
  entryId,
  initialOpacity,
  onOpacityChange,
}: SessionImageOpacityControlProps) {
  const [opacity, setOpacity] = useState(initialOpacity)
  const [isSaving, setIsSaving] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced save to avoid too many API calls
  const saveOpacity = useCallback(async (value: number) => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        const response = await fetch('/api/diary/session-image-opacity', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId, opacity: value }),
        })
        if (!response.ok) {
          console.error('Failed to save opacity')
        }
      } catch (error) {
        console.error('Error saving opacity:', error)
      } finally {
        setIsSaving(false)
      }
    }, 500)
  }, [entryId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) / 100
    setOpacity(value)
    onOpacityChange?.(value)
    saveOpacity(value)
  }

  return (
    <div className="rounded-xl bg-white/70 backdrop-blur-sm p-4 border border-pastel-pink/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📷</span>
        <span className="text-sm font-medium text-gray-700">배경 사진 투명도</span>
        {isSaving && (
          <span className="text-xs text-gray-400 ml-auto">저장 중...</span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={handleChange}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pastel-purple"
          />
          <span className="text-sm text-gray-600 w-12 text-right">
            {Math.round(opacity * 100)}%
          </span>
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span>투명</span>
          <span>불투명</span>
        </div>
      </div>
    </div>
  )
}
