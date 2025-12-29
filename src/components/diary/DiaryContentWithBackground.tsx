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
  initialSessionFontColor: string | null
  initialSessionFontSize: number | null
  initialSessionTextBgOpacity: number | null
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
  initialSessionFontColor,
  initialSessionFontSize,
  initialSessionTextBgOpacity,
}: DiaryContentWithBackgroundProps) {
  const [sessionImageOpacity, setSessionImageOpacity] = useState(initialSessionImageOpacity)
  const [currentFontColor, setCurrentFontColor] = useState(
    initialSessionFontColor ?? paperFontColor
  )
  const [currentFontSize, setCurrentFontSize] = useState(initialSessionFontSize ?? 1.0)
  const [currentTextBgOpacity, setCurrentTextBgOpacity] = useState<number | null>(
    initialSessionTextBgOpacity
  )

  return (
    <>
      {/* Diary Content */}
      <DiaryPaper
        template={paperTemplate}
        decorations={paperDecorations}
        paperOpacity={paperOpacity}
        paperFontFamily={paperFontFamily}
        paperFontColor={currentFontColor}
        sessionImageUrl={sessionImageUrl}
        sessionImageOpacity={sessionImageOpacity}
        sessionFontSize={currentFontSize}
        sessionTextBgOpacity={currentTextBgOpacity}
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

      {/* Session Style Control (shown when session image exists) */}
      {sessionImageUrl && (
        <div className="mb-8">
          <SessionImageOpacityControl
            entryId={entryId}
            initialOpacity={initialSessionImageOpacity}
            initialFontColor={initialSessionFontColor}
            initialFontSize={initialSessionFontSize}
            initialTextBgOpacity={initialSessionTextBgOpacity}
            diaryFontColor={paperFontColor}
            onOpacityChange={setSessionImageOpacity}
            onFontColorChange={setCurrentFontColor}
            onFontSizeChange={setCurrentFontSize}
            onTextBgOpacityChange={setCurrentTextBgOpacity}
          />
        </div>
      )}
    </>
  )
}
