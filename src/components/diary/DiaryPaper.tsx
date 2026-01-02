'use client'

import { PaperTemplate, LineStyle, PlacedDecoration, ShapeType, FONT_OPTIONS } from '@/types/customization'
import { DIARY_STYLE } from '@/lib/diary-entry-style'
import { ReactNode } from 'react'

// Helper to get font family CSS value
function getFontFamilyCSS(fontFamilyId: string): string {
  const font = FONT_OPTIONS.find(f => f.id === fontFamilyId)
  return font?.fontFamily || 'inherit'
}

// Helper function to get CSS clip-path for shape types
function getClipPathForShape(shapeType: ShapeType): string {
  switch (shapeType) {
    case 'circle':
      return 'circle(50% at 50% 50%)'
    case 'square':
      return 'inset(0)'
    case 'diamond':
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
    case 'heart':
      return 'polygon(50% 90%, 15% 55%, 0% 35%, 0% 20%, 15% 0%, 35% 0%, 50% 15%, 65% 0%, 85% 0%, 100% 20%, 100% 35%, 85% 55%)'
    case 'star':
      return 'polygon(50% 0%, 61% 38%, 100% 38%, 69% 62%, 80% 100%, 50% 76%, 20% 100%, 31% 62%, 0% 38%, 39% 38%)'
    default:
      return 'none'
  }
}

interface DiaryPaperProps {
  template: PaperTemplate | null
  decorations?: PlacedDecoration[]
  children: ReactNode
  className?: string
  paperFontFamily?: string
  sessionImageUrl?: string | null
  // Metadata for PDF-like layout
  entryDate?: string
  summary?: string | null
  emotions?: string[]
}

// Generate line pattern CSS
function getLinePattern(style: LineStyle, color: string): string {
  switch (style) {
    case 'lined':
      return `repeating-linear-gradient(
        transparent,
        transparent 27px,
        ${color} 27px,
        ${color} 28px
      )`
    case 'grid':
      return `
        linear-gradient(${color} 1px, transparent 1px),
        linear-gradient(90deg, ${color} 1px, transparent 1px)
      `
    case 'dotted':
      return `
        radial-gradient(circle, ${color} 1px, transparent 1px)
      `
    default:
      return 'none'
  }
}

function getBackgroundSize(style: LineStyle): string {
  switch (style) {
    case 'grid':
      return '28px 28px'
    case 'dotted':
      return '28px 28px'
    default:
      return 'auto'
  }
}

// Default paper style
const DEFAULT_PAPER: Pick<PaperTemplate, 'background_color' | 'line_style' | 'line_color'> = {
  background_color: '#FFFFFF',
  line_style: 'none',
  line_color: '#E5E5E5',
}

// Format date in Korean style
function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export function DiaryPaper({
  template,
  decorations = [],
  children,
  className = '',
  paperFontFamily = 'default',
  sessionImageUrl,
  entryDate,
  summary,
  emotions = [],
}: DiaryPaperProps) {
  // Resolve style based on session image presence
  const style = sessionImageUrl ? DIARY_STYLE.withImage : DIARY_STYLE.withoutImage
  const paper = template || DEFAULT_PAPER as PaperTemplate
  const { paper: paperStyle, typography } = DIARY_STYLE

  const linePattern = getLinePattern(
    paper.line_style as LineStyle,
    paper.line_color
  )
  const backgroundSize = getBackgroundSize(paper.line_style as LineStyle)

  // Build background styles - line pattern only (background image handled separately for opacity)
  const hasBackgroundImage = paper.background_image_url && paper.background_image_url.length > 0

  // Calculate height based on B5 aspect ratio
  const containerStyle = {
    backgroundColor: paper.background_color,
    aspectRatio: `${paperStyle.aspectRatio}`,
    maxWidth: `${paperStyle.maxWidth}px`,
    fontFamily: typography.fontFamily,
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden mx-auto ${className}`}
      style={containerStyle}
    >
      {/* Session image layer (takes precedence over template background) */}
      {sessionImageUrl && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${sessionImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: DIARY_STYLE.withImage.imageOpacity,
          }}
        />
      )}

      {/* Template background image layer with opacity control (only if no session image) */}
      {!sessionImageUrl && hasBackgroundImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${paper.background_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: DIARY_STYLE.withoutImage.bgImageOpacity,
          }}
        />
      )}

      {/* Line pattern layer (always full opacity) */}
      {linePattern !== 'none' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: linePattern,
            backgroundSize: backgroundSize,
          }}
        />
      )}

      {/* Paper decorations layer */}
      {decorations.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {decorations.map((decoration, index) => (
            <div
              key={index}
              className="absolute select-none"
              style={{
                left: `${decoration.x}%`,
                top: `${decoration.y}%`,
                transform: `translate(-50%, -50%) scale(${decoration.scale}) rotate(${decoration.rotation}deg)`,
                zIndex: decoration.z_index,
                opacity: DIARY_STYLE.decorations.opacity,
              }}
            >
              {decoration.type === 'emoji' ? (
                <span className="text-3xl">{decoration.content}</span>
              ) : decoration.type === 'photo' ? (
                <img
                  src={decoration.content}
                  alt="Decoration"
                  className="w-16 h-16 object-cover"
                  style={{
                    clipPath: decoration.photo_meta?.shape_type
                      ? getClipPathForShape(decoration.photo_meta.shape_type)
                      : undefined,
                  }}
                  draggable={false}
                />
              ) : decoration.type === 'text' ? (
                <span
                  className="whitespace-nowrap"
                  style={{
                    fontFamily: getFontFamilyCSS(decoration.text_meta?.font_family || 'default'),
                    fontSize: `${decoration.text_meta?.font_size || 24}px`,
                    color: decoration.text_meta?.font_color || '#333333',
                    fontWeight: decoration.text_meta?.font_weight || 'normal',
                  }}
                >
                  {decoration.content}
                </span>
              ) : (
                <span
                  className="block w-8 h-8 text-pastel-purple-dark"
                  dangerouslySetInnerHTML={{ __html: decoration.content }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content with font styles - PDF-like layout */}
      <div
        className="relative z-10 h-full flex flex-col"
        style={{
          padding: `${paperStyle.padding.vertical}px ${paperStyle.padding.horizontal}px`,
          fontFamily: getFontFamilyCSS(paperFontFamily),
          color: style.fontColor,
        }}
      >
        {/* Metadata header (like PDF) */}
        {entryDate && (
          <div className="flex-shrink-0">
            {/* Date */}
            <div
              style={{
                fontSize: `${typography.dateFontSize}px`,
                fontWeight: 600,
                color: DIARY_STYLE.metadata.dateColor,
                marginBottom: '6px',
              }}
            >
              {formatDateKorean(entryDate)}
            </div>

            {/* Summary */}
            {summary && (
              <div
                style={{
                  fontSize: `${typography.summaryFontSize}px`,
                  fontWeight: 600,
                  color: DIARY_STYLE.metadata.summaryColor,
                  marginBottom: '8px',
                  lineHeight: 1.4,
                }}
              >
                {summary}
              </div>
            )}

            {/* Emotions */}
            {emotions.length > 0 && (
              <div
                style={{
                  fontSize: `${typography.emotionsFontSize}px`,
                  color: DIARY_STYLE.metadata.emotionsColor,
                  marginBottom: '10px',
                }}
              >
                {emotions.join(' ')}
              </div>
            )}
          </div>
        )}

        {/* Main content */}
        <div
          className="flex-1 overflow-auto"
          style={{
            fontSize: `${typography.contentFontSize}px`,
            lineHeight: typography.lineHeight,
          }}
        >
          {children}
        </div>
      </div>

      {/* Paper texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5 z-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

// Paper template preview for selection
export function PaperPreview({
  template,
  isSelected,
  onClick,
}: {
  template: PaperTemplate
  isSelected?: boolean
  onClick?: () => void
}) {
  const linePattern = getLinePattern(
    template.line_style as LineStyle,
    template.line_color
  )
  const backgroundSize = getBackgroundSize(template.line_style as LineStyle)

  // Build background styles with image support
  const hasBackgroundImage = template.background_image_url && template.background_image_url.length > 0

  let backgroundImageStyle = linePattern
  let backgroundSizeStyle = backgroundSize

  if (hasBackgroundImage) {
    // Layer: line pattern on top of background image
    backgroundImageStyle = linePattern !== 'none'
      ? `${linePattern}, url(${template.background_image_url})`
      : `url(${template.background_image_url})`
    backgroundSizeStyle = linePattern !== 'none'
      ? `${backgroundSize}, cover`
      : 'cover'
  }

  return (
    <button
      onClick={onClick}
      className={`relative w-20 h-28 rounded-md overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-pastel-purple ring-2 ring-pastel-purple/30'
          : 'border-gray-200 hover:border-pastel-purple/50'
      }`}
      style={{
        backgroundColor: template.background_color,
        backgroundImage: backgroundImageStyle,
        backgroundSize: backgroundSizeStyle,
        backgroundPosition: 'center',
      }}
    >
      {/* Sample text lines */}
      <div className="absolute inset-2 flex flex-col gap-1">
        <div className="h-1.5 w-3/4 bg-gray-300 rounded-full" />
        <div className="h-1.5 w-full bg-gray-300 rounded-full" />
        <div className="h-1.5 w-2/3 bg-gray-300 rounded-full" />
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute bottom-1 right-1 w-4 h-4 bg-pastel-purple rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </button>
  )
}
