'use client'

import { forwardRef } from 'react'
import type { DiaryWithTemplates } from '@/types/diary'
import type { PlacedDecoration, ShapeType } from '@/types/customization'

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

// Extract dominant color for spine
function extractSpineColor(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '#C9B8DA'

  if (imageUrl.startsWith('gradient:')) {
    const match = imageUrl.match(/#[0-9A-Fa-f]{6}/)
    return match?.[0] || '#C9B8DA'
  }

  if (imageUrl.startsWith('solid:')) {
    return imageUrl.replace('solid:', '')
  }

  return '#C9B8DA'
}

// Darken color for spine effect
function darkenColor(hex: string, amount: number = 0.15): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount))
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount))
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount))
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

interface Book3DProps {
  diary: DiaryWithTemplates | null
  isOpening?: boolean
  className?: string
  onClick?: () => void
}

export const Book3D = forwardRef<HTMLDivElement, Book3DProps>(
  function Book3D({ diary, isOpening = false, className = '', onClick }, ref) {
    const BOOK_WIDTH = 240
    const BOOK_HEIGHT = 320
    const BOOK_DEPTH = 30

    // Default cover style if no diary or template
    const defaultStyle = {
      background: 'linear-gradient(135deg, #E8E0F0 0%, #D4C5E2 50%, #C9B8DA 100%)',
    }

    // Parse template image URL
    const coverStyle = diary?.cover_template
      ? (() => {
          const parsed = parseImageUrl(diary.cover_template.image_url)
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

    const spineColor = extractSpineColor(diary?.cover_template?.image_url)
    const spineDarker = darkenColor(spineColor, 0.1)
    const decorations: PlacedDecoration[] = diary?.cover_decorations || []

    return (
      <div
        ref={ref}
        className={`cursor-pointer ${className}`}
        style={{
          perspective: '1200px',
          perspectiveOrigin: 'center center',
        }}
        onClick={onClick}
      >
        <div
          className="relative transition-transform duration-700 ease-out"
          style={{
            width: BOOK_WIDTH,
            height: BOOK_HEIGHT,
            transformStyle: 'preserve-3d',
            transform: 'rotateY(-15deg) rotateX(5deg)',
          }}
        >
          {/* Front Cover - Opens like a real book */}
          <div
            className="absolute inset-0 rounded-r-lg shadow-2xl overflow-hidden transition-transform duration-700 ease-out"
            style={{
              ...coverStyle,
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
              transformOrigin: 'left center',
              transform: isOpening
                ? `translateZ(${BOOK_DEPTH / 2}px) rotateY(-160deg)`
                : `translateZ(${BOOK_DEPTH / 2}px) rotateY(0deg)`,
            }}
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
                  fontSize: '2rem',
                }}
              >
                {decoration.type === 'emoji' ? (
                  <span>{decoration.content}</span>
                ) : decoration.type === 'photo' ? (
                  <img
                    src={decoration.content}
                    alt="Photo decoration"
                    style={{
                      width: '60px',
                      height: '60px',
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
                    style={{ width: '36px', height: '36px' }}
                    dangerouslySetInnerHTML={{ __html: decoration.content }}
                  />
                )}
              </div>
            ))}

            {/* Front cover shine effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)',
              }}
            />

            {/* Back of front cover (visible when opened) */}
            <div
              className="absolute inset-0 rounded-r-lg"
              style={{
                background: 'linear-gradient(to right, #f8f6f0, #f0ebe0)',
                transform: 'rotateY(180deg)',
                backfaceVisibility: 'hidden',
              }}
            />
          </div>

          {/* First inside page (visible when cover opens) */}
          <div
            className="absolute inset-0 rounded-r-lg"
            style={{
              background: 'linear-gradient(to right, #fffef9, #f9f7f2)',
              transform: `translateZ(${BOOK_DEPTH / 2 - 2}px)`,
              boxShadow: 'inset 3px 0 8px rgba(0,0,0,0.05)',
            }}
          >
            {/* Page content placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <div className="w-16 h-16 mb-4 rounded-full bg-pastel-purple-light/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-pastel-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-pastel-purple-dark font-medium text-sm">오늘의 이야기</p>
              <p className="text-gray-400 text-xs mt-1">시작하기</p>
            </div>

            {/* Page edge shadow */}
            <div
              className="absolute left-0 top-0 bottom-0 w-4"
              style={{
                background: 'linear-gradient(to right, rgba(0,0,0,0.08), transparent)',
              }}
            />
          </div>

          {/* Spine (Left side) */}
          <div
            className="absolute rounded-l-sm"
            style={{
              width: BOOK_DEPTH,
              height: BOOK_HEIGHT,
              background: `linear-gradient(to right, ${spineDarker}, ${spineColor})`,
              transform: `rotateY(-90deg) translateZ(${BOOK_DEPTH / 2}px) translateX(-${BOOK_DEPTH / 2}px)`,
              transformOrigin: 'right center',
            }}
          >
            {/* Spine text (rotated) */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
              }}
            >
              <span className="text-xs font-medium text-white/80 tracking-wider">
                {diary?.title || `일기장 ${diary?.volume_number || 1}`}
              </span>
            </div>

            {/* Spine decorative lines */}
            <div className="absolute top-4 left-0 right-0 h-px bg-white/20" />
            <div className="absolute bottom-4 left-0 right-0 h-px bg-white/20" />
          </div>

          {/* Pages (Right edge - book thickness) */}
          <div
            className="absolute"
            style={{
              width: BOOK_DEPTH - 4,
              height: BOOK_HEIGHT - 8,
              top: 4,
              background: 'linear-gradient(to right, #f5f5f0, #fffef9, #f5f5f0)',
              transform: `rotateY(90deg) translateZ(${BOOK_WIDTH - BOOK_DEPTH / 2}px) translateX(-${(BOOK_DEPTH - 4) / 2}px)`,
              transformOrigin: 'left center',
              borderRadius: '0 2px 2px 0',
            }}
          >
            {/* Page lines */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-full"
                style={{
                  height: '1px',
                  top: `${(i + 1) * 6}%`,
                  background: 'rgba(0,0,0,0.03)',
                }}
              />
            ))}
          </div>

          {/* Back Cover */}
          <div
            className="absolute inset-0 rounded-r-lg"
            style={{
              background: spineDarker,
              transform: `translateZ(-${BOOK_DEPTH / 2}px)`,
              backfaceVisibility: 'hidden',
            }}
          />

          {/* Bottom edge */}
          <div
            className="absolute"
            style={{
              width: BOOK_WIDTH,
              height: BOOK_DEPTH,
              background: 'linear-gradient(to bottom, #f0f0eb, #e8e8e3)',
              transform: `rotateX(-90deg) translateZ(${BOOK_HEIGHT - BOOK_DEPTH / 2}px) translateY(-${BOOK_DEPTH / 2}px)`,
              transformOrigin: 'top center',
              borderRadius: '0 0 4px 0',
            }}
          />

          {/* Top edge */}
          <div
            className="absolute"
            style={{
              width: BOOK_WIDTH,
              height: BOOK_DEPTH,
              background: 'linear-gradient(to top, #fafaf5, #f5f5f0)',
              transform: `rotateX(90deg) translateZ(${BOOK_DEPTH / 2}px) translateY(${BOOK_DEPTH / 2}px)`,
              transformOrigin: 'bottom center',
              borderRadius: '4px 0 0 0',
            }}
          />
        </div>

        {/* Shadow */}
        <div
          className="absolute transition-all duration-700"
          style={{
            width: BOOK_WIDTH * 0.9,
            height: 20,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, transparent 70%)',
            filter: 'blur(8px)',
            bottom: '-30px',
            left: '50%',
            transform: isOpening
              ? 'translateX(-30%) scaleX(1.3)'
              : 'translateX(-50%) scaleX(1)',
          }}
        />

        {/* Cover shadow when opening */}
        {isOpening && (
          <div
            className="absolute transition-all duration-700"
            style={{
              width: BOOK_WIDTH * 0.6,
              height: 15,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, transparent 70%)',
              filter: 'blur(6px)',
              bottom: '-25px',
              left: '-20%',
            }}
          />
        )}
      </div>
    )
  }
)
