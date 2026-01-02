'use client'

import { DiaryPaper } from './DiaryPaper'
import type { PaperTemplate, PlacedDecoration } from '@/types/customization'

interface DiaryContentWithBackgroundProps {
  content: string
  paperTemplate: PaperTemplate | null
  paperDecorations: PlacedDecoration[]
  paperFontFamily: string
  sessionImageUrl: string | null
}

export function DiaryContentWithBackground({
  content,
  paperTemplate,
  paperDecorations,
  paperFontFamily,
  sessionImageUrl,
}: DiaryContentWithBackgroundProps) {
  return (
    <DiaryPaper
      template={paperTemplate}
      decorations={paperDecorations}
      paperFontFamily={paperFontFamily}
      sessionImageUrl={sessionImageUrl}
      className="mb-8 shadow-sm border border-pastel-pink/30"
    >
      <div className="prose max-w-none">
        {content.split('\n').map((paragraph: string, idx: number) => (
          <p key={idx} className="mb-4 last:mb-0 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </DiaryPaper>
  )
}
