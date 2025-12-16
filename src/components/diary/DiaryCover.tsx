'use client'

import { CoverTemplate, PlacedDecoration, ShapeType } from '@/types/customization'

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

interface DiaryCoverProps {
  template: CoverTemplate | null
  decorations: PlacedDecoration[]
  size?: 'preview' | 'full' | 'editor'
  className?: string
  onClick?: () => void
}

// Parse cover image_url which can be gradient, solid, or actual URL
function parseImageUrl(imageUrl: string): {
  type: 'gradient' | 'solid' | 'image'
  value: string
} {
  if (imageUrl.startsWith('gradient:')) {
    return { type: 'gradient', value: imageUrl.replace('gradient:', '') }
  }
  if (imageUrl.startsWith('solid:')) {
    return { type: 'solid', value: imageUrl.replace('solid:', '') }
  }
  return { type: 'image', value: imageUrl }
}

// Size configurations
const SIZES = {
  preview: { width: 120, height: 160, fontSize: 'text-lg' },
  full: { width: 300, height: 400, fontSize: 'text-4xl' },
  editor: { width: 300, height: 400, fontSize: 'text-4xl' },
}

export function DiaryCover({
  template,
  decorations,
  size = 'preview',
  className = '',
  onClick,
}: DiaryCoverProps) {
  const dimensions = SIZES[size]

  // Default cover style if no template
  const defaultStyle = {
    background: 'linear-gradient(135deg, #E8E0F0 0%, #D4C5E2 50%, #C9B8DA 100%)',
  }

  // Parse template image URL
  const coverStyle = template
    ? (() => {
        const parsed = parseImageUrl(template.image_url)
        switch (parsed.type) {
          case 'gradient':
            return { background: parsed.value }
          case 'solid':
            return { backgroundColor: parsed.value }
          case 'image':
            return { backgroundImage: `url(${parsed.value})`, backgroundSize: 'cover' }
        }
      })()
    : defaultStyle

  return (
    <div
      className={`relative rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        ...coverStyle,
      }}
      onClick={onClick}
    >
      {/* Decorations */}
      {decorations.map((decoration, index) => (
        <div
          key={index}
          className="absolute select-none pointer-events-none"
          style={{
            left: `${decoration.x}%`,
            top: `${decoration.y}%`,
            transform: `translate(-50%, -50%) scale(${decoration.scale}) rotate(${decoration.rotation}deg)`,
            zIndex: decoration.z_index,
            fontSize: size === 'preview' ? '1.5rem' : '2.5rem',
          }}
        >
          {decoration.type === 'emoji' ? (
            <span>{decoration.content}</span>
          ) : decoration.type === 'photo' ? (
            <img
              src={decoration.content}
              alt="Photo decoration"
              style={{
                width: size === 'preview' ? '40px' : '80px',
                height: size === 'preview' ? '40px' : '80px',
                objectFit: 'cover',
                clipPath: decoration.photo_meta?.shape_type
                  ? getClipPathForShape(decoration.photo_meta.shape_type)
                  : undefined,
              }}
              draggable={false}
            />
          ) : (
            <span
              className="block text-pastel-purple-dark"
              style={{ width: size === 'preview' ? '24px' : '40px', height: size === 'preview' ? '24px' : '40px' }}
              dangerouslySetInnerHTML={{ __html: decoration.content }}
            />
          )}
        </div>
      ))}

      {/* Book spine effect */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 opacity-20"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)',
        }}
      />
    </div>
  )
}

// Preview component for dashboard
export function CoverPreview({
  template,
  decorations,
  userName,
  onClick,
}: {
  template: CoverTemplate | null
  decorations: PlacedDecoration[]
  userName?: string
  onClick?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <DiaryCover
        template={template}
        decorations={decorations}
        size="preview"
        onClick={onClick}
      />
      {userName && (
        <p className="text-sm text-gray-500">{userName}의 일기장</p>
      )}
    </div>
  )
}
