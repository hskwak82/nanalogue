'use client'

import { useState, useEffect, useRef } from 'react'
import {
  FONT_OPTIONS,
  FONT_COLOR_PRESETS,
  TextMeta,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_FONT_COLOR,
  DEFAULT_TEXT_FONT_FAMILY,
  MIN_TEXT_FONT_SIZE,
  MAX_TEXT_FONT_SIZE,
} from '@/types/customization'

// Helper to get font family CSS value
function getFontFamilyCSS(fontFamilyId: string): string {
  const font = FONT_OPTIONS.find(f => f.id === fontFamilyId)
  return font?.fontFamily || 'inherit'
}

interface TextInputModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (text: string, textMeta: TextMeta) => void
  initialText?: string
  initialMeta?: TextMeta
}

export function TextInputModal({
  isOpen,
  onClose,
  onConfirm,
  initialText = '',
  initialMeta,
}: TextInputModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(initialText)
  const [fontFamily, setFontFamily] = useState(initialMeta?.font_family || DEFAULT_TEXT_FONT_FAMILY)
  const [fontSize, setFontSize] = useState(initialMeta?.font_size || DEFAULT_TEXT_FONT_SIZE)
  const [fontColor, setFontColor] = useState(initialMeta?.font_color || DEFAULT_TEXT_FONT_COLOR)
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>(initialMeta?.font_weight || 'normal')

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset state when modal opens with new values
  useEffect(() => {
    if (isOpen) {
      setText(initialText)
      setFontFamily(initialMeta?.font_family || DEFAULT_TEXT_FONT_FAMILY)
      setFontSize(initialMeta?.font_size || DEFAULT_TEXT_FONT_SIZE)
      setFontColor(initialMeta?.font_color || DEFAULT_TEXT_FONT_COLOR)
      setFontWeight(initialMeta?.font_weight || 'normal')
    }
  }, [isOpen, initialText, initialMeta])

  const handleConfirm = () => {
    if (!text.trim()) return
    onConfirm(text.trim(), {
      font_family: fontFamily,
      font_size: fontSize,
      font_color: fontColor,
      font_weight: fontWeight,
    })
    setText('')
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  const isCustomColor = !FONT_COLOR_PRESETS.includes(fontColor)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-700 mb-4">텍스트 추가</h3>

        {/* Text Input */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-2">텍스트 내용</label>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="텍스트를 입력하세요"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pastel-purple/50 focus:border-pastel-purple"
            style={{
              fontFamily: getFontFamilyCSS(fontFamily),
              fontSize: `${Math.min(fontSize, 24)}px`,
              color: fontColor,
              fontWeight: fontWeight,
            }}
          />
        </div>

        {/* Font Family */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-2">글꼴</label>
          <div className="grid grid-cols-4 gap-2">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font.id}
                onClick={() => setFontFamily(font.id)}
                className={`px-2 py-1.5 rounded-lg text-xs transition-all ${
                  fontFamily === font.id
                    ? 'bg-pastel-purple text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={{ fontFamily: font.fontFamily }}
              >
                {font.name}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-2">
            글자 크기: {fontSize}px
          </label>
          <input
            type="range"
            min={MIN_TEXT_FONT_SIZE}
            max={MAX_TEXT_FONT_SIZE}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pastel-purple"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{MIN_TEXT_FONT_SIZE}px</span>
            <span>{MAX_TEXT_FONT_SIZE}px</span>
          </div>
        </div>

        {/* Font Color */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-2">글자 색상</label>
          <div className="flex flex-wrap gap-2">
            {FONT_COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => setFontColor(color)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  fontColor === color
                    ? 'border-pastel-purple ring-2 ring-pastel-purple/30'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            {/* Custom color */}
            <label
              className={`relative w-7 h-7 rounded-full border-2 cursor-pointer transition-all flex items-center justify-center ${
                isCustomColor
                  ? 'border-pastel-purple ring-2 ring-pastel-purple/30'
                  : 'border-dashed border-gray-300 hover:border-gray-400'
              }`}
              style={isCustomColor ? { backgroundColor: fontColor } : undefined}
              title={isCustomColor ? fontColor : '사용자 색상 선택'}
            >
              <span
                className={`pointer-events-none text-xs font-bold ${
                  isCustomColor
                    ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]'
                    : 'text-gray-400'
                }`}
              >
                {isCustomColor ? '✎' : '+'}
              </span>
              <input
                type="color"
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Bold Toggle */}
        <div className="mb-6">
          <label className="block text-xs text-gray-600 mb-2">스타일</label>
          <button
            onClick={() => setFontWeight(fontWeight === 'normal' ? 'bold' : 'normal')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              fontWeight === 'bold'
                ? 'bg-pastel-purple text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            B 굵게
          </button>
        </div>

        {/* Preview */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-xs text-gray-400 mb-2">미리보기</label>
          <div
            className="min-h-[40px] flex items-center justify-center"
            style={{
              fontFamily: getFontFamilyCSS(fontFamily),
              fontSize: `${fontSize}px`,
              color: fontColor,
              fontWeight: fontWeight,
            }}
          >
            {text || '텍스트를 입력하세요'}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-full text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!text.trim()}
            className={`flex-1 px-4 py-2.5 rounded-full font-medium transition-colors ${
              text.trim()
                ? 'bg-pastel-purple text-white hover:bg-pastel-purple-dark'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {initialText ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
