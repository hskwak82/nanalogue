// Diary Customization Types

export type LineStyle = 'none' | 'lined' | 'grid' | 'dotted'
export type ItemType = 'emoji' | 'icon' | 'sticker' | 'photo'

// Photo Cropping Types
export type CropType = 'none' | 'lasso' | 'shape'
export type ShapeType = 'circle' | 'heart' | 'star' | 'square' | 'diamond'

// Photo metadata for cropped images
export interface PhotoMeta {
  photo_id: string           // Reference to user_photos table
  original_url: string       // Original uploaded image URL
  cropped_url?: string       // Cropped image URL (after processing)
  crop_type: CropType
  shape_type?: ShapeType     // Only when crop_type === 'shape'
  lasso_path?: string        // SVG path data for re-editing (only when crop_type === 'lasso')
}

// Shape mask definitions
export interface ShapeMask {
  id: ShapeType
  name: string
  icon: string
  is_free: boolean
  svg_path?: string          // SVG clip-path for complex shapes
}

export const SHAPE_MASKS: ShapeMask[] = [
  { id: 'circle', name: '원형', icon: '⚪', is_free: true },
  { id: 'square', name: '사각형', icon: '⬜', is_free: true },
  { id: 'diamond', name: '다이아몬드', icon: '◇', is_free: true },
  { id: 'heart', name: '하트', icon: '❤️', is_free: false },
  { id: 'star', name: '별', icon: '⭐', is_free: false },
]

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
  content: string            // For photos: cropped image URL
  x: number                  // position X (0-100 percentage)
  y: number                  // position Y (0-100 percentage)
  scale: number              // 0.5 - 3.0
  rotation: number           // degrees (-180 to 180)
  z_index: number
  photo_meta?: PhotoMeta     // Only when type === 'photo'
}

// Paper Style Settings
export interface PaperStyleSettings {
  paper_opacity: number       // 0.0 to 1.0
  paper_font_family: string   // font family name
  paper_font_color: string    // hex color
}

// User's diary customization settings
export interface DiaryCustomization {
  id: string
  user_id: string
  cover_template_id: string | null
  paper_template_id: string | null
  cover_decorations: PlacedDecoration[]
  paper_decorations: PlacedDecoration[]
  paper_opacity: number
  paper_font_family: string
  paper_font_color: string
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
  paper_decorations?: PlacedDecoration[]
  paper_opacity?: number
  paper_font_family?: string
  paper_font_color?: string
}

export interface CustomizationLoadResponse {
  user: {
    email: string
    name: string | null
  }
  customization: DiaryCustomization | null
  coverTemplates: CoverTemplate[]
  paperTemplates: PaperTemplate[]
  decorationItems: DecorationItem[]
}

// Editor State Types
export interface EditorState {
  selectedCover: CoverTemplate | null
  selectedPaper: PaperTemplate | null
  coverDecorations: PlacedDecoration[]
  paperDecorations: PlacedDecoration[]
  selectedItemIndex: number | null
  activeEditor: 'cover' | 'paper'
  isDirty: boolean
  // Paper style settings
  paperOpacity: number
  paperFontFamily: string
  paperFontColor: string
}

export type EditorAction =
  | { type: 'SET_COVER'; payload: CoverTemplate | null }
  | { type: 'SET_PAPER'; payload: PaperTemplate | null }
  | { type: 'ADD_COVER_DECORATION'; payload: PlacedDecoration }
  | { type: 'UPDATE_COVER_DECORATION'; payload: { index: number; decoration: Partial<PlacedDecoration> } }
  | { type: 'REMOVE_COVER_DECORATION'; payload: number }
  | { type: 'ADD_PAPER_DECORATION'; payload: PlacedDecoration }
  | { type: 'UPDATE_PAPER_DECORATION'; payload: { index: number; decoration: Partial<PlacedDecoration> } }
  | { type: 'REMOVE_PAPER_DECORATION'; payload: number }
  | { type: 'SELECT_ITEM'; payload: number | null }
  | { type: 'SET_ACTIVE_EDITOR'; payload: 'cover' | 'paper' }
  | { type: 'LOAD_STATE'; payload: { cover: CoverTemplate | null; paper: PaperTemplate | null; coverDecorations: PlacedDecoration[]; paperDecorations: PlacedDecoration[]; paperOpacity?: number; paperFontFamily?: string; paperFontColor?: string } }
  | { type: 'SET_PAPER_OPACITY'; payload: number }
  | { type: 'SET_PAPER_FONT_FAMILY'; payload: string }
  | { type: 'SET_PAPER_FONT_COLOR'; payload: string }
  | { type: 'RESET' }
  | { type: 'MARK_SAVED' }

// Decoration Category for UI grouping
export interface DecorationCategory {
  id: string
  name: string
  icon?: string
}

export const DECORATION_CATEGORIES: DecorationCategory[] = [
  { id: 'photo', name: '이미지 업로드', icon: '📷' },
  { id: 'nature', name: '자연/꽃', icon: '🌸' },
  { id: 'hearts', name: '하트', icon: '❤️' },
  { id: 'stars', name: '별/날씨', icon: '⭐' },
  { id: 'animals', name: '동물', icon: '🐰' },
  { id: 'food', name: '음식', icon: '🍰' },
  { id: 'objects', name: '사물', icon: '📖' },
  { id: 'shapes', name: '도형', icon: '⬡' },
  { id: 'decorative', name: '장식', icon: '✨' },
  { id: 'travel', name: '여행', icon: '✈️' },
  { id: 'celestial', name: '우주', icon: '🌙' },
  { id: 'luxury', name: '럭셔리', icon: '💎' },
  { id: 'art', name: '예술', icon: '🎨' },
  { id: 'seasons', name: '계절', icon: '🍂' },
]

// Default values
export const DEFAULT_DECORATION_SCALE = 1.0
export const DEFAULT_DECORATION_ROTATION = 0
export const MIN_SCALE = 0.3
export const MAX_SCALE = 10.0

// Paper style defaults
export const DEFAULT_PAPER_OPACITY = 1.0
export const DEFAULT_PAPER_FONT_FAMILY = 'default'
export const DEFAULT_PAPER_FONT_COLOR = '#333333'

// Available font families
export interface FontOption {
  id: string
  name: string
  fontFamily: string
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'default', name: '기본', fontFamily: 'inherit' },
  { id: 'nanum-gothic', name: '나눔고딕', fontFamily: '"Nanum Gothic", sans-serif' },
  { id: 'nanum-myeongjo', name: '나눔명조', fontFamily: '"Nanum Myeongjo", serif' },
  { id: 'nanum-pen', name: '나눔손글씨', fontFamily: '"Nanum Pen Script", cursive' },
  { id: 'gowun-dodum', name: '고운돋움', fontFamily: '"Gowun Dodum", sans-serif' },
  { id: 'gowun-batang', name: '고운바탕', fontFamily: '"Gowun Batang", serif' },
  { id: 'poor-story', name: '푸어스토리', fontFamily: '"Poor Story", cursive' },
  { id: 'gaegu', name: '개구', fontFamily: '"Gaegu", cursive' },
]

// Preset font colors
export const FONT_COLOR_PRESETS = [
  '#333333', // Dark gray (default)
  '#000000', // Black
  '#4A5568', // Gray
  '#2D3748', // Dark blue gray
  '#744210', // Brown
  '#22543D', // Dark green
  '#2C5282', // Dark blue
  '#553C9A', // Purple
  '#97266D', // Pink
  '#C53030', // Red
]
