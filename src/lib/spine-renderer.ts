import { SPINE_PRESETS, SpinePreset, DEFAULT_SPINE_PRESET_ID } from '@/types/spine'

/**
 * Get spine preset by ID, returns default preset if not found
 */
export function getSpinePreset(presetId: string | null | undefined): SpinePreset {
  if (!presetId) {
    return SPINE_PRESETS.find(p => p.id === DEFAULT_SPINE_PRESET_ID) || SPINE_PRESETS[0]
  }
  return SPINE_PRESETS.find(p => p.id === presetId) || SPINE_PRESETS[0]
}

/**
 * Get CSS background style for spine preset
 */
export function getSpineBackgroundStyle(preset: SpinePreset): React.CSSProperties {
  return { background: preset.background }
}

/**
 * Get CSS styles for spine bands (top/bottom decorative strips)
 */
export function getSpineBandStyles(preset: SpinePreset): {
  topBand: React.CSSProperties | null
  bottomBand: React.CSSProperties | null
} {
  return {
    topBand: preset.topBand
      ? {
          position: 'absolute' as const,
          top: 0,
          left: 0,
          right: 0,
          height: preset.topBand.height,
          background: preset.topBand.color,
        }
      : null,
    bottomBand: preset.bottomBand
      ? {
          position: 'absolute' as const,
          bottom: 0,
          left: 0,
          right: 0,
          height: preset.bottomBand.height,
          background: preset.bottomBand.color,
        }
      : null,
  }
}
