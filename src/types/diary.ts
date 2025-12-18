// Multi-Diary (Volume) Types

import type { CoverTemplate, PaperTemplate, PlacedDecoration } from './customization'

// Diary status
export type DiaryStatus = 'active' | 'completed' | 'archived'

// Diary (volume) type
export interface Diary {
  id: string
  user_id: string
  volume_number: number
  title: string | null
  status: DiaryStatus
  start_date: string  // YYYY-MM-DD
  end_date: string | null  // YYYY-MM-DD
  cover_template_id: string | null
  paper_template_id: string | null
  cover_decorations: PlacedDecoration[]
  paper_decorations: PlacedDecoration[]
  cover_image_url: string | null  // Pre-rendered cover image for fast display
  spine_position: number | null   // X position percentage for cropping cover image to display spine
  spine_width: number | null      // Spine width as ratio of cover (default 0.0667 = 6.67%, print: 12mm/180mm)
  spine_color: string | null
  spine_gradient: string | null
  spine_preset_id: string | null  // Preset-based spine style ID
  created_at: string
  updated_at: string
}

// Extended diary with template data
export interface DiaryWithTemplates extends Diary {
  cover_template: CoverTemplate | null
  paper_template: PaperTemplate | null
  entry_count?: number
}

// Diary creation request
export interface CreateDiaryRequest {
  title?: string
  cover_template_id?: string
  paper_template_id?: string
  inherit_from_previous?: boolean  // Copy customization from previous diary
}

// Diary update request
export interface UpdateDiaryRequest {
  title?: string
  cover_template_id?: string | null
  paper_template_id?: string | null
  cover_decorations?: PlacedDecoration[]
  paper_decorations?: PlacedDecoration[]
  spine_color?: string
  spine_gradient?: string
}

// Complete diary request (finish volume)
export interface CompleteDiaryRequest {
  end_date?: string  // Defaults to today
  create_new?: boolean  // Create new diary after completion
  new_diary_title?: string
}

// Bookshelf view types
export type BookshelfViewMode = 'covers' | 'spines'

export interface BookshelfState {
  viewMode: BookshelfViewMode
  selectedDiaryId: string | null
  isAnimating: boolean
}

// Spine dimensions and styling
export interface SpineStyle {
  width: number      // Calculated based on entry count (20-60px)
  height: number     // Fixed height (200px)
  color: string      // Primary color for spine
  gradient?: string  // Optional gradient string
  textColor: string  // Contrast color for text
}

// API response types
export interface DiaryListResponse {
  diaries: DiaryWithTemplates[]
  activeDiary: DiaryWithTemplates | null
}

export interface DiaryDetailResponse {
  diary: DiaryWithTemplates
  prevDiary: { id: string; volume_number: number; title: string | null } | null
  nextDiary: { id: string; volume_number: number; title: string | null } | null
}

// Print dimensions (180mm x 250mm)
export const PRINT_COVER_WIDTH_MM = 180
export const PRINT_COVER_HEIGHT_MM = 250
export const PRINT_SPINE_WIDTH_MM = 12  // 100 sheets @ 100g/m²
export const PRINT_ASPECT_RATIO = PRINT_COVER_WIDTH_MM / PRINT_COVER_HEIGHT_MM  // 0.72

// Display preview dimensions (matching print aspect ratio)
export const PREVIEW_COVER_WIDTH = 270
export const PREVIEW_COVER_HEIGHT = Math.round(PREVIEW_COVER_WIDTH / PRINT_ASPECT_RATIO)  // 375

// Spine calculation constants for display
// Spine width is proportional to cover width: 12mm / 180mm = 6.67%
// But for visibility, we use a scaled version
export const SPINE_WIDTH_RATIO = PRINT_SPINE_WIDTH_MM / PRINT_COVER_WIDTH_MM  // 0.0667
export const SPINE_MIN_WIDTH = 24  // Minimum visible width
export const SPINE_MAX_WIDTH = 50  // Maximum width
export const SPINE_HEIGHT = Math.round(150 / PRINT_ASPECT_RATIO)  // 208px (matches 150px width at 0.72 ratio)
export const ENTRIES_PER_PX = 5  // 5 entries = 1px extra width

// Helper to calculate spine width from entry count
export function calculateSpineWidth(entryCount: number): number {
  const extraWidth = Math.floor(entryCount / ENTRIES_PER_PX)
  return Math.min(SPINE_MIN_WIDTH + extraWidth, SPINE_MAX_WIDTH)
}

// Helper to extract primary color from cover template image_url
export function extractSpineColor(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '#C9B8DA'  // Default pastel purple

  if (imageUrl.startsWith('gradient:')) {
    // Extract first color from gradient
    const match = imageUrl.match(/#[0-9A-Fa-f]{6}/)
    return match?.[0] || '#C9B8DA'
  }

  if (imageUrl.startsWith('solid:')) {
    return imageUrl.replace('solid:', '')
  }

  return '#C9B8DA'
}

// Helper to calculate contrasting text color
export function getContrastTextColor(backgroundColor: string): string {
  // Remove # if present
  const hex = backgroundColor.replace('#', '')

  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return white for dark backgrounds, dark gray for light backgrounds
  return luminance > 0.5 ? '#374151' : '#FFFFFF'
}

// Format date range for display
export function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate)
  const startStr = start.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })

  if (!endDate) {
    return `${startStr} ~ 현재`
  }

  const end = new Date(endDate)
  const endStr = end.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })

  return `${startStr} ~ ${endStr}`
}
