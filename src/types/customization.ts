// Diary Customization Types

export type LineStyle = 'none' | 'lined' | 'grid' | 'dotted'
export type ItemType = 'emoji' | 'icon' | 'sticker'

// Cover Template
export interface CoverTemplate {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  image_url: string
  category: string
  is_free: boolean
  sort_order: number
  is_active: boolean
  created_at: string
}

// Paper Template
export interface PaperTemplate {
  id: string
  name: string
  thumbnail_url: string | null
  background_color: string
  background_image_url: string | null
  line_style: LineStyle
  line_color: string
  is_free: boolean
  sort_order: number
  is_active: boolean
  created_at: string
}

// Decoration Item (emoji, icon, sticker)
export interface DecorationItem {
  id: string
  name: string
  item_type: ItemType
  content: string  // emoji character or SVG code
  category: string
  is_free: boolean
  sort_order: number
  is_active: boolean
  created_at: string
}

// Placed decoration on cover
export interface PlacedDecoration {
  item_id: string
  type: ItemType
  content: string
  x: number        // position X (0-100 percentage)
  y: number        // position Y (0-100 percentage)
  scale: number    // 0.5 - 3.0
  rotation: number // degrees (-180 to 180)
  z_index: number
}

// User's diary customization settings
export interface DiaryCustomization {
  id: string
  user_id: string
  cover_template_id: string | null
  paper_template_id: string | null
  cover_decorations: PlacedDecoration[]
  created_at: string
  updated_at: string
}

// API Response Types
export interface CustomizationData {
  customization: DiaryCustomization | null
  coverTemplate: CoverTemplate | null
  paperTemplate: PaperTemplate | null
}

export interface CustomizationSaveRequest {
  cover_template_id?: string | null
  paper_template_id?: string | null
  cover_decorations?: PlacedDecoration[]
}

export interface CustomizationLoadResponse {
  customization: DiaryCustomization | null
  coverTemplates: CoverTemplate[]
  paperTemplates: PaperTemplate[]
  decorationItems: DecorationItem[]
}

// Editor State Types
export interface EditorState {
  selectedCover: CoverTemplate | null
  selectedPaper: PaperTemplate | null
  decorations: PlacedDecoration[]
  selectedItemIndex: number | null
  isDirty: boolean
}

export type EditorAction =
  | { type: 'SET_COVER'; payload: CoverTemplate | null }
  | { type: 'SET_PAPER'; payload: PaperTemplate | null }
  | { type: 'ADD_DECORATION'; payload: PlacedDecoration }
  | { type: 'UPDATE_DECORATION'; payload: { index: number; decoration: Partial<PlacedDecoration> } }
  | { type: 'REMOVE_DECORATION'; payload: number }
  | { type: 'SELECT_ITEM'; payload: number | null }
  | { type: 'LOAD_STATE'; payload: { cover: CoverTemplate | null; paper: PaperTemplate | null; decorations: PlacedDecoration[] } }
  | { type: 'RESET' }
  | { type: 'MARK_SAVED' }

// Decoration Category for UI grouping
export interface DecorationCategory {
  id: string
  name: string
  icon?: string
}

export const DECORATION_CATEGORIES: DecorationCategory[] = [
  { id: 'nature', name: '자연/꽃', icon: '🌸' },
  { id: 'hearts', name: '하트', icon: '❤️' },
  { id: 'stars', name: '별/날씨', icon: '⭐' },
  { id: 'animals', name: '동물', icon: '🐰' },
  { id: 'food', name: '음식', icon: '🍰' },
  { id: 'objects', name: '사물', icon: '📖' },
  { id: 'shapes', name: '도형', icon: '⬡' },
  { id: 'decorative', name: '장식', icon: '✨' },
]

// Default values
export const DEFAULT_DECORATION_SCALE = 1.0
export const DEFAULT_DECORATION_ROTATION = 0
export const MIN_SCALE = 0.3
export const MAX_SCALE = 10.0
