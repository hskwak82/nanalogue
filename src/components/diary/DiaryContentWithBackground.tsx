'use client'

import { DiaryEntryRenderer } from './DiaryEntryRenderer'
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
  createdAt?: string | null
}

export function DiaryContentWithBackground({
  content,
  paperTemplate,
  paperDecorations,
  sessionImageUrl,
  entryDate,
  summary,
  emotions,
  createdAt,
}: DiaryContentWithBackgroundProps) {
  // Use the EXACT same renderer as PDF
  // Scale up from PDF's 300px to 500px for better web readability
  // Using CSS transform to scale maintains pixel-perfect match with PDF
  const pdfWidth = 300
  const webDisplayWidth = 500
  const scaleFactor = webDisplayWidth / pdfWidth

  return (
    <div
      className="mb-8 shadow-sm border border-pastel-pink/30 rounded-lg overflow-hidden"
      style={{
        width: `${webDisplayWidth}px`,
        height: `${Math.round(webDisplayWidth / 0.72)}px`, // B5 ratio
        margin: '0 auto',
      }}
    >
      {/* Render at PDF size (300px) and scale up with CSS transform */}
      <div
        style={{
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'top left',
        }}
      >
        <DiaryEntryRenderer
          entryDate={entryDate || ''}
          summary={summary}
          emotions={emotions}
          content={content}
          createdAt={createdAt}
          paperTemplate={paperTemplate}
          paperDecorations={paperDecorations}
          sessionImageUrl={sessionImageUrl}
          width={pdfWidth}  // Same as PDF
        />
      </div>
    </div>
  )
}
