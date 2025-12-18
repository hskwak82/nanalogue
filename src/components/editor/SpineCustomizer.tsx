'use client'

import { useState, useEffect } from 'react'
import { SPINE_PRESETS, SpinePreset, DEFAULT_SPINE_PRESET_ID, FREE_SPINE_PRESETS, PREMIUM_SPINE_PRESETS } from '@/types/spine'
import { getSpinePreset, getSpineBackgroundStyle, getSpineBandStyles } from '@/lib/spine-renderer'

interface SpineTemplateFromDB {
  id: string
  name: string
  background: string
  top_band_color: string | null
  top_band_height: string | null
  bottom_band_color: string | null
  bottom_band_height: string | null
  text_color: string
  is_free: boolean
  sort_order: number
}

interface SpineCustomizerProps {
  selectedPresetId: string | null
  diaryTitle: string
  onChange: (presetId: string) => void
  previewMode?: 'large'  // Large preview only (left side)
  selectorMode?: boolean // Selector panel only (right side)
  isPremium?: boolean    // User has premium subscription
}

// Large spine preview dimensions (matches cover height of 400px)
const LARGE_PREVIEW_HEIGHT = 400
const LARGE_PREVIEW_WIDTH = 48

// Convert DB template to SpinePreset format
function dbTemplateToPreset(template: SpineTemplateFromDB): SpinePreset {
  return {
    id: template.id,
    name: template.name,
    background: template.background,
    textColor: template.text_color,
    topBand: template.top_band_color && template.top_band_height
      ? { color: template.top_band_color, height: template.top_band_height }
      : undefined,
    bottomBand: template.bottom_band_color && template.bottom_band_height
      ? { color: template.bottom_band_color, height: template.bottom_band_height }
      : undefined,
    isPremium: !template.is_free,
  }
}

// Spine preview component (large version for spine tab)
function LargeSpinePreview({ preset, title }: { preset: SpinePreset; title: string }) {
  const bandStyles = getSpineBandStyles(preset)

  return (
    <div
      className="relative rounded-sm shadow-lg overflow-hidden"
      style={{
        width: LARGE_PREVIEW_WIDTH,
        height: LARGE_PREVIEW_HEIGHT,
        ...getSpineBackgroundStyle(preset),
      }}
    >
      {/* Top band */}
      {bandStyles.topBand && <div style={bandStyles.topBand} />}

      {/* Title */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-1 z-10">
        <span
          className="text-sm font-medium text-center drop-shadow-sm"
          style={{
            color: preset.textColor,
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            letterSpacing: '0.1em',
            textShadow: '0 1px 2px rgba(255,255,255,0.3), 0 -1px 2px rgba(255,255,255,0.3)',
          }}
        >
          {title.length > 10 ? title.slice(0, 10) : title}
        </span>
      </div>

      {/* Bottom band */}
      {bandStyles.bottomBand && <div style={bandStyles.bottomBand} />}

      {/* Spine edge effects */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] z-10" style={{ background: 'rgba(0,0,0,0.15)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-[1px] z-10" style={{ background: 'rgba(255,255,255,0.3)' }} />
    </div>
  )
}

// Preset card for selector (similar to template selector pattern)
function PresetCard({
  preset,
  selected,
  onClick,
  disabled,
}: {
  preset: SpinePreset
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  const bandStyles = getSpineBandStyles(preset)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative rounded-lg overflow-hidden transition-all p-2 ${
        selected
          ? 'ring-2 ring-pastel-purple bg-pastel-purple/10'
          : disabled
          ? 'opacity-50 cursor-not-allowed border border-gray-200'
          : 'hover:bg-gray-50 border border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Mini spine preview */}
        <div
          className="relative rounded-sm overflow-hidden flex-shrink-0"
          style={{
            width: 24,
            height: 80,
            ...getSpineBackgroundStyle(preset),
          }}
        >
          {bandStyles.topBand && (
            <div style={{ ...bandStyles.topBand, height: '12%' }} />
          )}
          {bandStyles.bottomBand && (
            <div style={{ ...bandStyles.bottomBand, height: '12%' }} />
          )}
          <div className="absolute left-0 top-0 bottom-0 w-[1px]" style={{ background: 'rgba(0,0,0,0.1)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-[1px]" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>
        {/* Name */}
        <span className="text-sm font-medium text-gray-700">{preset.name}</span>
      </div>
      {/* Lock icon for premium */}
      {disabled && (
        <div className="absolute top-1 right-1">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  )
}

export function SpineCustomizer({
  selectedPresetId,
  diaryTitle,
  onChange,
  previewMode,
  selectorMode,
  isPremium = false,
}: SpineCustomizerProps) {
  const [activeCategory, setActiveCategory] = useState<'free' | 'premium'>('free')
  const [dbTemplates, setDbTemplates] = useState<SpinePreset[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load templates from database
  useEffect(() => {
    async function loadTemplates() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/spine-templates')
        if (response.ok) {
          const data = await response.json()
          if (data.templates && data.templates.length > 0) {
            const presets = data.templates.map(dbTemplateToPreset)
            setDbTemplates(presets)
          }
        }
      } catch (error) {
        console.error('Error loading spine templates:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadTemplates()
  }, [])

  // Use DB templates if available, otherwise fallback to static
  const allPresets = dbTemplates || SPINE_PRESETS
  const freePresets = dbTemplates
    ? dbTemplates.filter(p => !p.isPremium)
    : FREE_SPINE_PRESETS
  const premiumPresets = dbTemplates
    ? dbTemplates.filter(p => p.isPremium)
    : PREMIUM_SPINE_PRESETS

  // Get selected preset
  const selectedPreset = dbTemplates
    ? (dbTemplates.find(p => p.id === selectedPresetId) || dbTemplates[0] || getSpinePreset(selectedPresetId))
    : getSpinePreset(selectedPresetId)

  // Large preview mode only (left side of spine tab)
  if (previewMode === 'large') {
    return (
      <div className="flex flex-col items-center">
        <LargeSpinePreview preset={selectedPreset} title={diaryTitle || '일기장'} />
        <p className="mt-3 text-sm text-gray-600 font-medium">{selectedPreset.name}</p>
      </div>
    )
  }

  // Selector mode (right side of spine tab, similar to template selectors)
  if (selectorMode) {
    const presetsToShow = activeCategory === 'free' ? freePresets : premiumPresets

    return (
      <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
        <h3 className="text-base font-semibold text-gray-700 mb-4">책등 선택</h3>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveCategory('free')}
            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === 'free'
                ? 'bg-pastel-mint text-gray-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            무료 ({freePresets.length})
          </button>
          <button
            onClick={() => setActiveCategory('premium')}
            className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === 'premium'
                ? 'bg-pastel-peach text-gray-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            ✨ 프리미엄 ({premiumPresets.length})
          </button>
        </div>

        {/* Preset grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pastel-purple"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
            {presetsToShow.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                selected={selectedPresetId === preset.id || (!selectedPresetId && preset.id === DEFAULT_SPINE_PRESET_ID)}
                onClick={() => onChange(preset.id)}
                disabled={preset.isPremium && !isPremium}
              />
            ))}
          </div>
        )}

        {/* Premium notice */}
        {activeCategory === 'premium' && !isPremium && (
          <p className="mt-4 text-xs text-center text-gray-500">
            프리미엄 구독으로 모든 책등 스타일을 사용해보세요!
          </p>
        )}
      </div>
    )
  }

  // Default: compact mode (original behavior - preview + small grid)
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">책등 꾸미기</h3>

      {/* Preview */}
      <div className="flex justify-center py-2">
        <div
          className="relative rounded-sm shadow-md overflow-hidden"
          style={{
            width: 32,
            height: 160,
            ...getSpineBackgroundStyle(selectedPreset),
          }}
        >
          {getSpineBandStyles(selectedPreset).topBand && (
            <div style={getSpineBandStyles(selectedPreset).topBand!} />
          )}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-1 z-10">
            <span
              className="text-[10px] font-medium text-center drop-shadow-sm"
              style={{
                color: selectedPreset.textColor,
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
                letterSpacing: '0.05em',
              }}
            >
              {(diaryTitle || '일기장').slice(0, 6)}
            </span>
          </div>
          {getSpineBandStyles(selectedPreset).bottomBand && (
            <div style={getSpineBandStyles(selectedPreset).bottomBand!} />
          )}
          <div className="absolute left-0 top-0 bottom-0 w-[1px]" style={{ background: 'rgba(0,0,0,0.15)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-[1px]" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-4 gap-2">
        {allPresets.slice(0, 12).map((preset) => {
          const bandStyles = getSpineBandStyles(preset)
          const isSelected = selectedPresetId === preset.id || (!selectedPresetId && preset.id === DEFAULT_SPINE_PRESET_ID)
          const isDisabled = preset.isPremium && !isPremium

          return (
            <button
              key={preset.id}
              onClick={() => !isDisabled && onChange(preset.id)}
              disabled={isDisabled}
              className={`relative rounded-md overflow-hidden transition-all ${
                isSelected
                  ? 'ring-2 ring-pastel-purple ring-offset-2 scale-105'
                  : isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 hover:shadow-md'
              }`}
              style={{ width: 40, height: 60 }}
              title={preset.name}
            >
              <div className="absolute inset-0" style={getSpineBackgroundStyle(preset)} />
              {bandStyles.topBand && (
                <div style={{ ...bandStyles.topBand, height: '15%' }} />
              )}
              {bandStyles.bottomBand && (
                <div style={{ ...bandStyles.bottomBand, height: '15%' }} />
              )}
              <span
                className="absolute inset-0 flex items-center justify-center text-[8px] font-medium"
                style={{ color: preset.textColor }}
              >
                {preset.name.slice(0, 2)}
              </span>
              {/* Lock icon for premium */}
              {isDisabled && (
                <div className="absolute top-0.5 right-0.5">
                  <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected preset name */}
      <p className="text-xs text-center text-gray-500">
        {selectedPreset.name}
      </p>
    </div>
  )
}
