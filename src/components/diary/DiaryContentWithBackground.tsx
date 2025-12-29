'use client'

import { useState } from 'react'
import { DiaryPaper } from './DiaryPaper'
import { SessionImageOpacityControl } from './SessionImageOpacityControl'
import type { PaperTemplate, PlacedDecoration } from '@/types/customization'

interface DiaryContentWithBackgroundProps {
  entryId: string
  content: string
  paperTemplate: PaperTemplate | null
  paperDecorations: PlacedDecoration[]
  paperOpacity: number
  paperFontFamily: string
  paperFontColor: string
  sessionImageUrl: string | null
  initialSessionImageOpacity: number
}

export function DiaryContentWithBackground({
  entryId,
  content,
  paperTemplate,
  paperDecorations,
  paperOpacity,
  paperFontFamily,
  paperFontColor,
  sessionImageUrl,
  initialSessionImageOpacity,
}: DiaryContentWithBackgroundProps) {
  const [sessionImageOpacity, setSessionImageOpacity] = useState(initialSessionImageOpacity)

  return (
    <>
      {/* Diary Content */}
      <DiaryPaper
        template={paperTemplate}
        decorations={paperDecorations}
        paperOpacity={paperOpacity}
        paperFontFamily={paperFontFamily}
        paperFontColor={paperFontColor}
        sessionImageUrl={sessionImageUrl}
        sessionImageOpacity={sessionImageOpacity}
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

      {/* Session Image Opacity Control */}
      {sessionImageUrl && (
        <div className="mb-8">
          <SessionImageOpacityControl
            entryId={entryId}
            initialOpacity={initialSessionImageOpacity}
            onOpacityChange={setSessionImageOpacity}
          />
        </div>
      )}
    </>
  )
}
