// Print specifications for diary book publishing
// Based on 180mm x 250mm cover, 100 sheets @ 100g/m² paper

export const PRINT_SPECS = {
  // Physical dimensions in mm
  COVER_WIDTH_MM: 180,
  COVER_HEIGHT_MM: 250,
  SPINE_WIDTH_MM: 12, // 100 sheets @ 100g/m² ≈ 0.12mm per sheet
  BLEED_MM: 3, // Standard print bleed margin

  // DPI for print quality
  DPI: 300,
  MM_TO_PX: 11.811, // 300 DPI / 25.4 mm per inch

  // Pixel dimensions WITH bleed (for print-ready PDF)
  // Cover: (180 + 6) x (250 + 6) mm = 186 x 256 mm
  COVER_WIDTH_PX: 2196, // Math.round(186 * 11.811)
  COVER_HEIGHT_PX: 3024, // Math.round(256 * 11.811)

  // Spine: 12 x (250 + 6) mm = 12 x 256 mm
  SPINE_WIDTH_PX: 142, // Math.round(12 * 11.811)
  SPINE_HEIGHT_PX: 3024, // Same as cover height with bleed

  // Pixel dimensions WITHOUT bleed (trim size)
  COVER_TRIM_WIDTH_PX: 2126, // Math.round(180 * 11.811)
  COVER_TRIM_HEIGHT_PX: 2953, // Math.round(250 * 11.811)

  // Bleed in pixels
  BLEED_PX: 35, // Math.round(3 * 11.811)

  // Aspect ratios
  PRINT_ASPECT_RATIO: 0.72, // 180/250
  LEGACY_ASPECT_RATIO: 0.75, // 300/400 (current display)

  // Screen preview dimensions (for admin UI)
  PREVIEW_COVER_WIDTH: 270, // 180/250 * 375 = 270
  PREVIEW_COVER_HEIGHT: 375,
  PREVIEW_SPINE_WIDTH: 18, // 12mm scaled proportionally

  // Inner page specifications
  INNER_PAGE_COUNT: 100, // 100 pages for 3 months of diary
  SAFE_MARGIN_MM: 10, // Safe text area margin from trim line
  SAFE_MARGIN_PX: 118, // Math.round(10 * 11.811)
} as const

// Calculate pixelRatio needed for html-to-image to achieve 300 DPI
// Base canvas: 300x400px, Target: ~2196x3024px
// pixelRatio = 2196/300 ≈ 7.32
export const CAPTURE_PIXEL_RATIO = Math.ceil(
  PRINT_SPECS.COVER_WIDTH_PX / 300
)

// Display spine width calculation for bookshelf
// 12mm spine / 180mm cover = 6.67% of cover width
export const DISPLAY_SPINE_WIDTH_RATIO = PRINT_SPECS.SPINE_WIDTH_MM / PRINT_SPECS.COVER_WIDTH_MM

// Helper functions
export function mmToPx(mm: number): number {
  return Math.round(mm * PRINT_SPECS.MM_TO_PX)
}

export function pxToMm(px: number): number {
  return px / PRINT_SPECS.MM_TO_PX
}

// Calculate spine width based on page count and paper weight
export function calculateSpineWidth(pageCount: number, paperWeightGsm: number = 100): number {
  // Paper thickness approximation based on weight
  // 80gsm ≈ 0.10mm, 100gsm ≈ 0.12mm, 120gsm ≈ 0.15mm
  const thicknessPerSheet = paperWeightGsm <= 80 ? 0.10 : paperWeightGsm <= 100 ? 0.12 : 0.15
  return pageCount * thicknessPerSheet
}
