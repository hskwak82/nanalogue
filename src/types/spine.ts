// Spine preset types for bookshelf customization

export interface SpineBand {
  color: string
  height: string  // CSS percentage value like '12%'
}

export interface SpinePreset {
  id: string
  name: string
  background: string           // CSS background value (color or gradient)
  topBand?: SpineBand          // Optional top decorative band
  bottomBand?: SpineBand       // Optional bottom decorative band
  textColor: string            // Title text color for contrast
}

// Predefined spine presets
export const SPINE_PRESETS: SpinePreset[] = [
  {
    id: 'lavender',
    name: '라벤더',
    background: '#E8E0F0',
    textColor: '#4A4A4A',
  },
  {
    id: 'mint',
    name: '민트',
    background: '#B8E6D4',
    textColor: '#2D5A4A',
  },
  {
    id: 'rose',
    name: '로즈',
    background: '#F4D4D4',
    textColor: '#8B4A4A',
  },
  {
    id: 'cream',
    name: '크림',
    background: '#FFF8E7',
    textColor: '#6B5A3A',
  },
  {
    id: 'sky',
    name: '하늘',
    background: 'linear-gradient(180deg, #87CEEB 0%, #E0F4FF 100%)',
    textColor: '#2A5A7A',
  },
  {
    id: 'sunset',
    name: '노을',
    background: 'linear-gradient(180deg, #FFB366 0%, #FF8C66 100%)',
    textColor: '#5A2A1A',
  },
  {
    id: 'classic',
    name: '클래식',
    background: '#F5DEB3',
    topBand: { color: '#8B4513', height: '12%' },
    bottomBand: { color: '#8B4513', height: '12%' },
    textColor: '#5A3A1A',
  },
  {
    id: 'modern',
    name: '모던',
    background: '#2C3E50',
    topBand: { color: '#E74C3C', height: '8%' },
    textColor: '#FFFFFF',
  },
]

// Default preset ID
export const DEFAULT_SPINE_PRESET_ID = 'lavender'
