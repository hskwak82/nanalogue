'use client'

import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface SessionImageOpacityControlProps {
  entryId: string
  initialOpacity: number
  initialFontColor: string | null
  initialFontSize: number | null
  initialTextBgOpacity: number | null
  diaryFontColor: string
  onOpacityChange?: (opacity: number) => void
  onFontColorChange?: (color: string) => void
  onFontSizeChange?: (size: number) => void
  onTextBgOpacityChange?: (opacity: number | null) => void
}

const FONT_COLOR_PRESETS = [
  { label: '기본', value: null, color: null },
  { label: '검정', value: '#1a1a1a', color: '#1a1a1a' },
  { label: '진회색', value: '#333333', color: '#333333' },
  { label: '회색', value: '#666666', color: '#666666' },
  { label: '흰색', value: '#ffffff', color: '#ffffff' },
  { label: '갈색', value: '#5c4033', color: '#5c4033' },
  { label: '남색', value: '#1e3a5f', color: '#1e3a5f' },
]

const FONT_SIZE_PRESETS = [
  { label: '작게', value: 0.85 },
  { label: '기본', value: 1.0 },
  { label: '크게', value: 1.15 },
  { label: '매우 크게', value: 1.3 },
]

export function SessionImageOpacityControl({
  entryId,
  initialOpacity,
  initialFontColor,
  initialFontSize,
  initialTextBgOpacity,
  diaryFontColor,
  onOpacityChange,
  onFontColorChange,
  onFontSizeChange,
  onTextBgOpacityChange,
}: SessionImageOpacityControlProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [opacity, setOpacity] = useState(initialOpacity)
  const [savedOpacity, setSavedOpacity] = useState(initialOpacity)
  const [fontColor, setFontColor] = useState<string | null>(initialFontColor)
  const [savedFontColor, setSavedFontColor] = useState<string | null>(initialFontColor)
  const [fontSize, setFontSize] = useState(initialFontSize ?? 1.0)
  const [savedFontSize, setSavedFontSize] = useState(initialFontSize ?? 1.0)
  const [textBgOpacity, setTextBgOpacity] = useState(initialTextBgOpacity ?? 0)
  const [savedTextBgOpacity, setSavedTextBgOpacity] = useState(initialTextBgOpacity ?? 0)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  const hasChanges =
    opacity !== savedOpacity ||
    fontColor !== savedFontColor ||
    fontSize !== savedFontSize ||
    textBgOpacity !== savedTextBgOpacity

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) / 100
    setOpacity(value)
    onOpacityChange?.(value)
  }

  const handleFontColorSelect = (color: string | null) => {
    setFontColor(color)
    onFontColorChange?.(color ?? diaryFontColor)
  }

  const handleFontSizeSelect = (size: number) => {
    setFontSize(size)
    onFontSizeChange?.(size)
  }

  const handleTextBgOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) / 100
    setTextBgOpacity(value)
    onTextBgOpacityChange?.(value === 0 ? null : value)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/diary/session-image-opacity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          opacity,
          fontColor,
          fontSize: fontSize === 1.0 ? null : fontSize,
          textBgOpacity: textBgOpacity === 0 ? null : textBgOpacity,
        }),
      })
      if (response.ok) {
        setSavedOpacity(opacity)
        setSavedFontColor(fontColor)
        setSavedFontSize(fontSize)
        setSavedTextBgOpacity(textBgOpacity)
        setShowSaveSuccess(true)
        setTimeout(() => setShowSaveSuccess(false), 2000)
      } else {
        console.error('Failed to save style')
      }
    } catch (error) {
      console.error('Error saving style:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setOpacity(savedOpacity)
    setFontColor(savedFontColor)
    setFontSize(savedFontSize)
    setTextBgOpacity(savedTextBgOpacity)
    onOpacityChange?.(savedOpacity)
    onFontColorChange?.(savedFontColor ?? diaryFontColor)
    onFontSizeChange?.(savedFontSize)
    onTextBgOpacityChange?.(savedTextBgOpacity === 0 ? null : savedTextBgOpacity)
  }

  const currentDisplayColor = fontColor ?? diaryFontColor

  return (
    <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-pastel-pink/30 overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          <span className="text-sm font-medium text-gray-700">속지 스타일</span>
          {showSaveSuccess && (
            <span className="text-xs text-pastel-mint flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              저장됨
            </span>
          )}
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Accordion Content */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-4 pb-4 space-y-4">
        {/* Opacity Control */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">📷</span>
            <span className="text-xs text-gray-600">배경 사진 투명도</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(opacity * 100)}
              onChange={handleOpacityChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pastel-purple"
            />
            <span className="text-sm text-gray-600 w-12 text-right">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>투명</span>
            <span>불투명</span>
          </div>
        </div>

        {/* Text Background Opacity Control */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">📝</span>
            <span className="text-xs text-gray-600">글자 배경 불투명도</span>
            <span className="text-xs text-gray-400">(가독성 향상)</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(textBgOpacity * 100)}
              onChange={handleTextBgOpacityChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pastel-purple"
            />
            <span className="text-sm text-gray-600 w-12 text-right">
              {Math.round(textBgOpacity * 100)}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>없음</span>
            <span>불투명</span>
          </div>
        </div>

        {/* Font Size Control */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🔤</span>
            <span className="text-xs text-gray-600">글자 크기</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FONT_SIZE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleFontSizeSelect(preset.value)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  Math.abs(fontSize - preset.value) < 0.01
                    ? 'border-pastel-purple bg-pastel-purple-light/30 ring-1 ring-pastel-purple/50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-gray-700">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Color Control */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">✏️</span>
            <span className="text-xs text-gray-600">글자 색상</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FONT_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleFontColorSelect(preset.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                  (fontColor === preset.value) || (fontColor === null && preset.value === null)
                    ? 'border-pastel-purple bg-pastel-purple-light/30 ring-1 ring-pastel-purple/50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{
                    backgroundColor: preset.color ?? diaryFontColor,
                  }}
                />
                <span className="text-gray-700">{preset.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            현재: <span style={{ color: currentDisplayColor }}>{currentDisplayColor}</span>
            {fontColor === null && ' (일기장 기본값)'}
          </p>
        </div>

        {/* Save/Reset buttons */}
        {hasChanges && (
          <div className="flex gap-2 pt-2 border-t border-gray-100">
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
    </div>
  )
}
