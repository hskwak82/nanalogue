'use client'

import { useState, useEffect } from 'react'

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
  const [savedOpacity, setSavedOpacity] = useState(initialOpacity)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  const hasChanges = opacity !== savedOpacity

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) / 100
    setOpacity(value)
    onOpacityChange?.(value) // Real-time preview
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/diary/session-image-opacity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, opacity }),
      })
      if (response.ok) {
        setSavedOpacity(opacity)
        setShowSaveSuccess(true)
        setTimeout(() => setShowSaveSuccess(false), 2000)
      } else {
        console.error('Failed to save opacity')
      }
    } catch (error) {
      console.error('Error saving opacity:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Reset to saved value
  const handleReset = () => {
    setOpacity(savedOpacity)
    onOpacityChange?.(savedOpacity)
  }

  return (
    <div className="rounded-xl bg-white/70 backdrop-blur-sm p-4 border border-pastel-pink/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📷</span>
        <span className="text-sm font-medium text-gray-700">배경 사진 투명도</span>
        {showSaveSuccess && (
          <span className="text-xs text-pastel-mint ml-auto flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            저장됨
          </span>
        )}
      </div>

      <div className="space-y-3">
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

        {/* Save/Reset buttons */}
        {hasChanges && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleReset}
              className="flex-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-3 py-2 text-sm text-white bg-pastel-purple hover:bg-pastel-purple-dark rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
