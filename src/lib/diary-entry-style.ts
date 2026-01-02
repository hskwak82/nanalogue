/**
 * Unified diary entry rendering style constants
 * Used by both web (DiaryPaper.tsx) and PDF (client-pdf-generator.ts)
 * to ensure identical appearance
 */

export const DIARY_STYLE = {
  // When session image exists (takes precedence)
  withImage: {
    imageOpacity: 0.65, // Higher = more image visible, less white overlay
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

  // Typography for web (scaled up from PDF's 300px to web's 500px display)
  // PDF renders at 300px then scales to full page, so web needs larger sizes
  typography: {
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    dateFontSize: 18,      // PDF: 11px * (500/300) ≈ 18px
    summaryFontSize: 22,   // PDF: 13px * (500/300) ≈ 22px
    emotionsFontSize: 15,  // PDF: 9px * (500/300) ≈ 15px
    contentFontSize: 17,   // PDF: 10px * (500/300) ≈ 17px
    lineHeight: 1.9,
  },

  // PDF rendering sizes (used by client-pdf-generator at 300px preview width)
  pdf: {
    dateFontSize: 11,
    summaryFontSize: 13,
    emotionsFontSize: 9,
    contentFontSize: 10,
    lineHeight: 1.9,
  },
} as const

/**
 * Resolve entry style based on session image presence
 */
export function resolveEntryStyle(hasSessionImage: boolean) {
  return hasSessionImage ? DIARY_STYLE.withImage : DIARY_STYLE.withoutImage
}
