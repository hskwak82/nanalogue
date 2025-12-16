'use client'

import { PaperTemplate, LineStyle, PlacedDecoration, ShapeType } from '@/types/customization'
import { ReactNode } from 'react'

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

export function DiaryPaper({
  template,
  decorations = [],
  children,
  className = '',
}: DiaryPaperProps) {
  const paper = template || DEFAULT_PAPER as PaperTemplate

  const linePattern = getLinePattern(
    paper.line_style as LineStyle,
    paper.line_color
  )
  const backgroundSize = getBackgroundSize(paper.line_style as LineStyle)

  return (
    <div
      className={`relative min-h-[400px] p-6 rounded-lg overflow-hidden ${className}`}
      style={{
        backgroundColor: paper.background_color,
        backgroundImage: linePattern,
        backgroundSize: backgroundSize,
      }}
    >
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
                opacity: 0.6, // Make decorations subtle on paper
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

      {/* Content */}
      <div className="relative z-10">{children}</div>

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
        backgroundImage: linePattern,
        backgroundSize: backgroundSize,
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
