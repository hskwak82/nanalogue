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
  isPremium?: boolean          // Premium preset flag
}

// Predefined spine presets
export const SPINE_PRESETS: SpinePreset[] = [
  // ===== FREE PRESETS =====
  // Solid Colors
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
    id: 'peach',
    name: '피치',
    background: '#FFDAB9',
    textColor: '#8B5A2B',
  },
  {
    id: 'skyblue',
    name: '스카이블루',
    background: '#B0E0E6',
    textColor: '#2F4F4F',
  },
  {
    id: 'lemon',
    name: '레몬',
    background: '#FFFACD',
    textColor: '#6B6B3A',
  },
  {
    id: 'coral',
    name: '코랄',
    background: '#FFB4A2',
    textColor: '#6B3A3A',
  },
  // Gradients
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
  // With Bands
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

  // ===== PREMIUM PRESETS =====
  // Luxurious Solid Colors
  {
    id: 'gold',
    name: '골드',
    background: 'linear-gradient(180deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)',
    textColor: '#4A3A1A',
    isPremium: true,
  },
  {
    id: 'rosegold',
    name: '로즈골드',
    background: 'linear-gradient(180deg, #E8B4B8 0%, #F5D0C5 50%, #E8B4B8 100%)',
    textColor: '#6B4A4A',
    isPremium: true,
  },
  {
    id: 'silver',
    name: '실버',
    background: 'linear-gradient(180deg, #C0C0C0 0%, #E8E8E8 50%, #C0C0C0 100%)',
    textColor: '#3A3A3A',
    isPremium: true,
  },
  {
    id: 'navy',
    name: '네이비',
    background: '#1E3A5F',
    textColor: '#D4AF37',
    isPremium: true,
  },
  {
    id: 'burgundy',
    name: '버건디',
    background: '#722F37',
    textColor: '#F5DEB3',
    isPremium: true,
  },
  {
    id: 'emerald',
    name: '에메랄드',
    background: '#046307',
    textColor: '#F5F5DC',
    isPremium: true,
  },
  // Premium Gradients
  {
    id: 'aurora',
    name: '오로라',
    background: 'linear-gradient(180deg, #A8E6CF 0%, #88D8B0 25%, #7FCDCD 50%, #B8A9C9 75%, #DDA0DD 100%)',
    textColor: '#2A4A3A',
    isPremium: true,
  },
  {
    id: 'galaxy',
    name: '갤럭시',
    background: 'linear-gradient(180deg, #0F0C29 0%, #302B63 50%, #24243E 100%)',
    textColor: '#E8E0F0',
    isPremium: true,
  },
  {
    id: 'ocean',
    name: '오션',
    background: 'linear-gradient(180deg, #006994 0%, #0099B4 50%, #48D1CC 100%)',
    textColor: '#FFFFFF',
    isPremium: true,
  },
  {
    id: 'cherry',
    name: '체리블라썸',
    background: 'linear-gradient(180deg, #FFB7C5 0%, #FF69B4 50%, #FFB7C5 100%)',
    textColor: '#4A1A2A',
    isPremium: true,
  },
  {
    id: 'forest',
    name: '포레스트',
    background: 'linear-gradient(180deg, #228B22 0%, #2E8B57 50%, #3CB371 100%)',
    textColor: '#F5F5DC',
    isPremium: true,
  },
  // Premium with Bands
  {
    id: 'leather',
    name: '레더',
    background: '#8B4513',
    topBand: { color: '#D4AF37', height: '6%' },
    bottomBand: { color: '#D4AF37', height: '6%' },
    textColor: '#F5DEB3',
    isPremium: true,
  },
  {
    id: 'velvet',
    name: '벨벳',
    background: '#800020',
    topBand: { color: '#FFD700', height: '5%' },
    bottomBand: { color: '#FFD700', height: '5%' },
    textColor: '#FFD700',
    isPremium: true,
  },
  {
    id: 'marble',
    name: '마블',
    background: 'linear-gradient(180deg, #F5F5F5 0%, #E8E8E8 25%, #F0F0F0 50%, #D8D8D8 75%, #F5F5F5 100%)',
    topBand: { color: '#2C3E50', height: '4%' },
    bottomBand: { color: '#2C3E50', height: '4%' },
    textColor: '#2C3E50',
    isPremium: true,
  },
  {
    id: 'vintage',
    name: '빈티지',
    background: '#D2B48C',
    topBand: { color: '#654321', height: '10%' },
    bottomBand: { color: '#654321', height: '10%' },
    textColor: '#3E2723',
    isPremium: true,
  },
  {
    id: 'royal',
    name: '로얄',
    background: '#4B0082',
    topBand: { color: '#FFD700', height: '8%' },
    bottomBand: { color: '#FFD700', height: '8%' },
    textColor: '#FFD700',
    isPremium: true,
  },
  {
    id: 'midnight',
    name: '미드나잇',
    background: 'linear-gradient(180deg, #191970 0%, #000080 50%, #191970 100%)',
    topBand: { color: '#C0C0C0', height: '3%' },
    bottomBand: { color: '#C0C0C0', height: '3%' },
    textColor: '#E8E8E8',
    isPremium: true,
  },
]

// Default preset ID
export const DEFAULT_SPINE_PRESET_ID = 'lavender'

// Helper to get free presets
export const FREE_SPINE_PRESETS = SPINE_PRESETS.filter(p => !p.isPremium)

// Helper to get premium presets
export const PREMIUM_SPINE_PRESETS = SPINE_PRESETS.filter(p => p.isPremium)
