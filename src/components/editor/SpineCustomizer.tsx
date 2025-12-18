'use client'

import { SPINE_PRESETS, SpinePreset, DEFAULT_SPINE_PRESET_ID } from '@/types/spine'
import { getSpinePreset, getSpineBackgroundStyle, getSpineBandStyles } from '@/lib/spine-renderer'

interface SpineCustomizerProps {
  selectedPresetId: string | null
  diaryTitle: string
  onChange: (presetId: string) => void
}

// Spine preview dimensions
const PREVIEW_HEIGHT = 160
const PREVIEW_WIDTH = 32

function SpinePreview({ preset, title }: { preset: SpinePreset; title: string }) {
  const bandStyles = getSpineBandStyles(preset)

  return (
    <div
      className="relative rounded-sm shadow-md overflow-hidden mx-auto"
      style={{
        width: PREVIEW_WIDTH,
        height: PREVIEW_HEIGHT,
        ...getSpineBackgroundStyle(preset),
      }}
    >
      {/* Top band */}
      {bandStyles.topBand && <div style={bandStyles.topBand} />}

      {/* Title */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-1">
        <span
          className="text-[10px] font-medium text-center drop-shadow-sm"
          style={{
            color: preset.textColor,
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            letterSpacing: '0.05em',
          }}
        >
          {title.length > 6 ? title.slice(0, 6) : title}
        </span>
      </div>

      {/* Bottom band */}
      {bandStyles.bottomBand && <div style={bandStyles.bottomBand} />}

      {/* Spine edge effects */}
      <div className="absolute left-0 top-0 bottom-0 w-[1px]" style={{ background: 'rgba(0,0,0,0.15)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-[1px]" style={{ background: 'rgba(255,255,255,0.2)' }} />
    </div>
  )
}

function PresetButton({
  preset,
  selected,
  onClick,
}: {
  preset: SpinePreset
  selected: boolean
  onClick: () => void
}) {
  const bandStyles = getSpineBandStyles(preset)

  return (
    <button
      onClick={onClick}
      className={`relative rounded-md overflow-hidden transition-all ${
        selected
          ? 'ring-2 ring-pastel-purple ring-offset-2 scale-105'
          : 'hover:scale-105 hover:shadow-md'
      }`}
      style={{ width: 40, height: 60 }}
      title={preset.name}
    >
      <div
        className="absolute inset-0"
        style={getSpineBackgroundStyle(preset)}
      />
      {bandStyles.topBand && (
        <div
          style={{
            ...bandStyles.topBand,
            height: '15%', // Slightly larger for visibility in small preview
          }}
        />
      )}
      {bandStyles.bottomBand && (
        <div
          style={{
            ...bandStyles.bottomBand,
            height: '15%',
          }}
        />
      )}
      <span
        className="absolute inset-0 flex items-center justify-center text-[8px] font-medium"
        style={{ color: preset.textColor }}
      >
        {preset.name.slice(0, 2)}
      </span>
    </button>
  )
}

export function SpineCustomizer({
  selectedPresetId,
  diaryTitle,
  onChange,
}: SpineCustomizerProps) {
  const selectedPreset = getSpinePreset(selectedPresetId)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">책등 꾸미기</h3>

      {/* Preview */}
      <div className="flex justify-center py-2">
        <SpinePreview preset={selectedPreset} title={diaryTitle || '일기장'} />
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-4 gap-2">
        {SPINE_PRESETS.map((preset) => (
          <PresetButton
            key={preset.id}
            preset={preset}
            selected={selectedPresetId === preset.id || (!selectedPresetId && preset.id === DEFAULT_SPINE_PRESET_ID)}
            onClick={() => onChange(preset.id)}
          />
        ))}
      </div>

      {/* Selected preset name */}
      <p className="text-xs text-center text-gray-500">
        {selectedPreset.name}
      </p>
    </div>
  )
}
