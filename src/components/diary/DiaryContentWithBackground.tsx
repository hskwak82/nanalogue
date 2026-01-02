'use client'

import { DiaryPaper } from './DiaryPaper'
import type { PaperTemplate, PlacedDecoration } from '@/types/customization'

interface DiaryContentWithBackgroundProps {
  content: string
  paperTemplate: PaperTemplate | null
  paperDecorations: PlacedDecoration[]
  paperFontFamily: string
  sessionImageUrl: string | null
  // Metadata for PDF-like layout
  entryDate?: string
  summary?: string | null
  emotions?: string[]
}

export function DiaryContentWithBackground({
  content,
  paperTemplate,
  paperDecorations,
  paperFontFamily,
  sessionImageUrl,
  entryDate,
  summary,
  emotions,
}: DiaryContentWithBackgroundProps) {
  return (
    <DiaryPaper
      template={paperTemplate}
      decorations={paperDecorations}
      paperFontFamily={paperFontFamily}
      sessionImageUrl={sessionImageUrl}
      entryDate={entryDate}
      summary={summary}
      emotions={emotions}
      className="mb-8 shadow-sm border border-pastel-pink/30"
    >
      {/* Content - rendered as pre-wrap text like PDF */}
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {content}
      </div>
    </DiaryPaper>
  )
}
