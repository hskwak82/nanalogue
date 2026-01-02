'use client'

/**
 * Unified diary entry renderer - IDENTICAL output for web and PDF
 * This component renders diary entries exactly as they appear in PDF
 */

import { DIARY_STYLE } from '@/lib/diary-entry-style'
import type { PaperTemplate, PlacedDecoration } from '@/types/customization'

// Font family mapping (same as PDF generator)
const FONT_FAMILY_MAP: Record<string, string> = {
  default: "'Pretendard', sans-serif",
  'nanum-gothic': "'Nanum Gothic', sans-serif",
  'nanum-myeongjo': "'Nanum Myeongjo', serif",
  'nanum-pen': "'Nanum Pen Script', cursive",
  'gowun-dodum': "'Gowun Dodum', sans-serif",
  'gowun-batang': "'Gowun Batang', serif",
  gaegu: "'Gaegu', cursive",
  'poor-story': "'Poor Story', cursive",
}

// Format date in Korean (same as PDF)
function formatDateKorean(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

interface DiaryEntryRendererProps {
  // Entry data
  entryDate: string
  summary?: string | null
  emotions?: string[]
  content: string
  createdAt?: string | null  // Creation timestamp
  // Paper customization
  paperTemplate: PaperTemplate | null
  paperDecorations?: PlacedDecoration[]
  sessionImageUrl?: string | null
  // Display options
  width?: number  // Default: 300 (same as PDF preview)
  className?: string
}

// Format creation timestamp
function formatCreatedAt(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = d.getHours().toString().padStart(2, '0')
  const minute = d.getMinutes().toString().padStart(2, '0')
  return `작성: ${year}년 ${month}월 ${day}일 ${hour}:${minute}`
}

export function DiaryEntryRenderer({
  entryDate,
  summary,
  emotions = [],
  content,
  createdAt,
  paperTemplate,
  paperDecorations = [],
  sessionImageUrl,
  width = 300,  // PDF uses 300px preview width
  className = '',
}: DiaryEntryRendererProps) {
  // Calculate height based on B5 aspect ratio (same as PDF)
  const height = Math.round(width / DIARY_STYLE.paper.aspectRatio)

  // Paper styles (same as PDF)
  const bgColor = paperTemplate?.background_color || '#FFFEF0'
  const lineColor = paperTemplate?.line_color || '#E5E7EB'
  const lineStyle = paperTemplate?.line_style || 'lined'
  const backgroundImage = paperTemplate?.background_image_url

  // Font color based on session image presence (same as PDF)
  const hasSessionImage = !!sessionImageUrl
  const contentFontColor = hasSessionImage
    ? DIARY_STYLE.withImage.fontColor
    : DIARY_STYLE.withoutImage.fontColor

  // Line pattern (same as PDF)
  const getLinePattern = () => {
    switch (lineStyle) {
      case 'lined':
        return `repeating-linear-gradient(transparent, transparent 27px, ${lineColor} 27px, ${lineColor} 28px)`
      case 'grid':
        return `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`
      case 'dotted':
        return `radial-gradient(circle, ${lineColor} 1px, transparent 1px)`
      default:
        return 'none'
    }
  }

  const getBackgroundSize = () => {
    switch (lineStyle) {
      case 'grid':
        return '28px 28px'
      case 'dotted':
        return '20px 20px'
      default:
        return 'auto'
    }
  }

  // Render decoration (same logic as PDF)
  const renderDecoration = (decoration: PlacedDecoration, index: number) => {
    const { type, content: decorContent, x, y, scale, rotation, z_index, text_meta } = decoration

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
      zIndex: z_index,
    }

    if (type === 'text' && text_meta) {
      const fontFamily = FONT_FAMILY_MAP[text_meta.font_family] || 'inherit'
      return (
        <div
          key={index}
          style={{
            ...baseStyle,
            fontFamily,
            fontSize: `${text_meta.font_size || 24}px`,
            fontWeight: text_meta.font_weight || 'normal',
            color: text_meta.font_color || '#333333',
            opacity: text_meta.opacity ?? 0.8,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {decorContent}
        </div>
      )
    }

    if (type === 'emoji' || type === 'sticker' || type === 'icon') {
      // PDF uses: fontSize = 24 * scale
      const fontSize = 24 * scale
      return (
        <div
          key={index}
          style={{
            ...baseStyle,
            fontSize: `${fontSize}px`,
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {decorContent}
        </div>
      )
    }

    if (type === 'photo' && decorContent) {
      return (
        <img
          key={index}
          src={decorContent}
          alt=""
          style={{
            ...baseStyle,
            maxWidth: '100px',
            maxHeight: '100px',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
      )
    }

    return null
  }

  // Build background style string
  let backgroundStyleStr = `background-color: ${bgColor};`
  const linePattern = getLinePattern()
  if (linePattern !== 'none') {
    backgroundStyleStr += ` background-image: ${linePattern};`
    const bgSize = getBackgroundSize()
    if (bgSize !== 'auto') {
      backgroundStyleStr += ` background-size: ${bgSize};`
    }
  }

  return (
    <div
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: bgColor,
        backgroundImage: linePattern !== 'none' ? linePattern : undefined,
        backgroundSize: linePattern !== 'none' ? getBackgroundSize() : undefined,
        padding: '25px 22px',
        boxSizing: 'border-box',
        position: 'relative',
        fontFamily: "'Pretendard', sans-serif",
        overflow: 'hidden',
        borderRadius: '8px',
      }}
    >
      {/* Background layers - SAME as PDF */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}>
        {/* Session image layer */}
        {sessionImageUrl && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: `url(${sessionImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: DIARY_STYLE.withImage.imageOpacity,
            }}
          />
        )}

        {/* Paper template background image (if no session image) */}
        {!sessionImageUrl && backgroundImage && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: DIARY_STYLE.withoutImage.bgImageOpacity,
            }}
          />
        )}

        {/* Decorations layer */}
        {paperDecorations.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              opacity: DIARY_STYLE.decorations.opacity,
              pointerEvents: 'none',
            }}
          >
            {paperDecorations.map((dec, idx) => renderDecoration(dec, idx))}
          </div>
        )}
      </div>

      {/* Content layer - SAME as PDF */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%' }}>
        {/* Header row: date (left) + created at (right) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: `${DIARY_STYLE.pdf.dateFontSize}px`,
            fontWeight: 600,
            color: DIARY_STYLE.metadata.dateColor,
            marginBottom: '6px',
          }}
        >
          <span>{formatDateKorean(entryDate)}</span>
          {createdAt && (
            <span style={{ fontWeight: 400, fontSize: '8px', color: DIARY_STYLE.metadata.createdAtColor }}>
              {formatCreatedAt(createdAt)}
            </span>
          )}
        </div>

        {summary && (
          <div
            style={{
              fontSize: `${DIARY_STYLE.pdf.summaryFontSize}px`,
              fontWeight: 600,
              color: DIARY_STYLE.metadata.summaryColor,
              marginBottom: '8px',
              lineHeight: 1.4,
            }}
          >
            {summary}
          </div>
        )}

        {emotions.length > 0 && (
          <div
            style={{
              fontSize: `${DIARY_STYLE.pdf.emotionsFontSize}px`,
              color: DIARY_STYLE.metadata.emotionsColor,
              marginBottom: '10px',
            }}
          >
            {emotions.join(' ')}
          </div>
        )}

        {/* Content */}
        <div
          style={{
            fontSize: `${DIARY_STYLE.pdf.contentFontSize}px`,
            color: contentFontColor,
            lineHeight: DIARY_STYLE.pdf.lineHeight,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
