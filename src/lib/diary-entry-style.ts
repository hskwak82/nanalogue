/**
 * Unified diary entry rendering style constants
 * Used by both web (DiaryPaper.tsx) and PDF (client-pdf-generator.ts)
 * to ensure identical appearance
 */

export const DIARY_STYLE = {
  // When session image exists (takes precedence)
  withImage: {
    imageOpacity: 0.35,
    fontColor: '#374151',
    bgImageOpacity: 0, // Session image takes precedence over template bg
  },

  // When no session image (use paper template)
  withoutImage: {
    bgImageOpacity: 0.3,
    fontColor: '#333333',
  },

  // Decoration layer opacity
  decorations: {
    opacity: 0.5,
  },

  // Metadata colors (used in both web and PDF)
  metadata: {
    dateColor: '#6B7280',
    summaryColor: '#374151',
    emotionsColor: '#9CA3AF',
  },

  // B5 paper dimensions (180mm x 250mm)
  paper: {
    aspectRatio: 0.72, // width/height = 180/250
    maxWidth: 500, // max width in pixels for web display
    padding: {
      horizontal: 25, // px
      vertical: 25, // px
    },
  },

  // Typography (unified for web and PDF - identical values)
  typography: {
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    dateFontSize: 11,
    summaryFontSize: 13,
    emotionsFontSize: 9,
    contentFontSize: 10, // same as PDF for exact match
    lineHeight: 1.9,
  },
} as const

/**
 * Resolve entry style based on session image presence
 */
export function resolveEntryStyle(hasSessionImage: boolean) {
  return hasSessionImage ? DIARY_STYLE.withImage : DIARY_STYLE.withoutImage
}
