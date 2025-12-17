'use client'

import { FONT_OPTIONS, FONT_COLOR_PRESETS } from '@/types/customization'

interface PaperStyleSettingsProps {
  opacity: number
  fontFamily: string
  fontColor: string
  onOpacityChange: (opacity: number) => void
  onFontFamilyChange: (fontFamily: string) => void
  onFontColorChange: (color: string) => void
}

export function PaperStyleSettings({
  opacity,
  fontFamily,
  fontColor,
  onOpacityChange,
  onFontFamilyChange,
  onFontColorChange,
}: PaperStyleSettingsProps) {
  return (
    <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-pastel-pink/30">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">글자 스타일</h3>

      {/* Background Opacity */}
      <div className="mb-4">
        <label className="block text-xs text-gray-600 mb-2">
          배경 투명도: {Math.round(opacity * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={opacity * 100}
          onChange={(e) => onOpacityChange(parseInt(e.target.value) / 100)}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pastel-purple"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>투명</span>
          <span>불투명</span>
        </div>
      </div>

      {/* Font Family */}
      <div className="mb-4">
        <label className="block text-xs text-gray-600 mb-2">글꼴</label>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.id}
              onClick={() => onFontFamilyChange(font.id)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
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

      {/* Font Color */}
      <div>
        <label className="block text-xs text-gray-600 mb-2">글자 색상</label>
        <div className="flex flex-wrap gap-2">
          {FONT_COLOR_PRESETS.map((color) => (
            <button
              key={color}
              onClick={() => onFontColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                fontColor === color
                  ? 'border-pastel-purple ring-2 ring-pastel-purple/30'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          {/* Custom color input */}
          <label className="relative w-8 h-8 rounded-full border-2 border-dashed border-gray-300 cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-center">
            <span className="text-gray-400 text-xs pointer-events-none">+</span>
            <input
              type="color"
              value={fontColor}
              onChange={(e) => onFontColorChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
