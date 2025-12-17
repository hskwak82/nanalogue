'use client'

import { forwardRef } from 'react'
import type { DiaryWithTemplates } from '@/types/diary'
import type { PlacedDecoration, ShapeType } from '@/types/customization'
import { FONT_OPTIONS } from '@/types/customization'

// Helper function to get font family CSS value
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

// Decoration renderer component
function DecorationRenderer({
  decorations,
  size = 'normal'
}: {
  decorations: PlacedDecoration[]
  size?: 'normal' | 'small'
}) {
  const emojiFontSize = size === 'small' ? '1.5rem' : '2rem'
  const imgSize = size === 'small' ? '40px' : '60px'
  const svgSize = size === 'small' ? '24px' : '36px'
  // Text scaling factor: normal view is already smaller than editor, small is for thumbnails
  const textScaleFactor = size === 'small' ? 0.4 : 0.7

  return (
    <>
      {decorations.map((decoration, index) => (
        <div
          key={index}
          className="absolute select-none pointer-events-none"
          style={{
            left: `${decoration.x}%`,
            top: `${decoration.y}%`,
            transform: `translate(-50%, -50%) scale(${decoration.scale}) rotate(${decoration.rotation}deg)`,
            zIndex: decoration.z_index,
            fontSize: emojiFontSize,
          }}
        >
          {decoration.type === 'emoji' ? (
            <span>{decoration.content}</span>
          ) : decoration.type === 'photo' ? (
            <img
              src={decoration.content}
              alt="Photo decoration"
              style={{
                width: imgSize,
                height: imgSize,
                objectFit: 'cover',
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
                fontSize: `${(decoration.text_meta?.font_size || 24) * textScaleFactor}px`,
                color: decoration.text_meta?.font_color || '#333333',
                fontWeight: decoration.text_meta?.font_weight || 'normal',
              }}
            >
              {decoration.content}
            </span>
          ) : (
            <span
              className="block text-pastel-purple-dark"
              style={{ width: svgSize, height: svgSize }}
              dangerouslySetInnerHTML={{ __html: decoration.content }}
            />
          )}
        </div>
      ))}
    </>
  )
}

interface LatestEntry {
  date: string
  content: string
}

interface Book3DProps {
  diary: DiaryWithTemplates | null
  isOpening?: boolean
  className?: string
  onClick?: () => void
  latestEntry?: LatestEntry
}

export const Book3D = forwardRef<HTMLDivElement, Book3DProps>(
  function Book3D({ diary, isOpening = false, className = '', onClick, latestEntry }, ref) {
    const BOOK_WIDTH = 220
    const BOOK_HEIGHT = 300
    const BOOK_DEPTH = 24

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
    const coverDecorations: PlacedDecoration[] = diary?.cover_decorations || []
    const paperDecorations: PlacedDecoration[] = diary?.paper_decorations || []

    return (
      <div
        ref={ref}
        className={`cursor-pointer ${className}`}
        style={{
          perspective: '1500px',
          perspectiveOrigin: 'center center',
        }}
        onClick={onClick}
      >
        {/* Container that expands when opening */}
        <div
          className="relative transition-all duration-700 ease-out mx-auto"
          style={{
            width: isOpening ? BOOK_WIDTH * 2 + BOOK_DEPTH : BOOK_WIDTH,
            height: BOOK_HEIGHT,
          }}
        >
          {/* 3D Book Container */}
          <div
            className="absolute transition-transform duration-700 ease-out"
            style={{
              width: BOOK_WIDTH,
              height: BOOK_HEIGHT,
              left: isOpening ? BOOK_WIDTH : 0,
              transformStyle: 'preserve-3d',
              transform: isOpening
                ? 'rotateY(0deg) rotateX(0deg)'
                : 'rotateY(-15deg) rotateX(5deg)',
            }}
          >
            {/* Front Cover - rotates open */}
            <div
              className="absolute transition-transform duration-700 ease-out"
              style={{
                width: BOOK_WIDTH,
                height: BOOK_HEIGHT,
                transformStyle: 'preserve-3d',
                transformOrigin: 'left center',
                transform: isOpening
                  ? `translateZ(${BOOK_DEPTH / 2}px) rotateY(-180deg)`
                  : `translateZ(${BOOK_DEPTH / 2}px) rotateY(0deg)`,
              }}
            >
              {/* Cover Front Face */}
              <div
                className="absolute inset-0 rounded-r-lg shadow-xl overflow-hidden"
                style={{
                  ...coverStyle,
                  backfaceVisibility: 'hidden',
                }}
              >
                <DecorationRenderer decorations={coverDecorations} />

                {/* Shine effect */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)',
                  }}
                />
              </div>

              {/* Cover Back Face (inside of cover) */}
              <div
                className="absolute inset-0 rounded-l-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(to left, #f5f3ed, #ebe7df)',
                  transform: 'rotateY(180deg)',
                  backfaceVisibility: 'hidden',
                }}
              >
                {/* Marbled paper texture */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  }}
                />
                <div className="absolute inset-4 border border-pastel-purple/20 rounded" />
              </div>
            </div>

            {/* Inside Page (Right page with paper decorations) */}
            <div
              className="absolute inset-0 rounded-r-lg overflow-hidden"
              style={{
                background: 'linear-gradient(to right, #fffef9, #faf8f3)',
                transform: `translateZ(${BOOK_DEPTH / 2 - 1}px)`,
                boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.04)',
              }}
            >
              {/* Paper decorations */}
              <DecorationRenderer decorations={paperDecorations} />

              {/* Latest diary entry content (blurred preview) */}
              {latestEntry && (
                <div className="absolute inset-0 p-6 pt-8 overflow-hidden">
                  {/* Date */}
                  <p className="text-xs text-pastel-purple/60 mb-3">
                    {new Date(latestEntry.date).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </p>
                  {/* Content preview - blurred */}
                  <div
                    className="text-xs text-gray-600/40 leading-relaxed line-clamp-[12]"
                    style={{
                      filter: 'blur(1px)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                      maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                    }}
                  >
                    {latestEntry.content}
                  </div>
                </div>
              )}

              {/* If no entry, show placeholder */}
              {!latestEntry && paperDecorations.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  <div className="w-12 h-12 mb-3 rounded-full bg-pastel-purple-light/40 flex items-center justify-center">
                    <svg className="w-6 h-6 text-pastel-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-pastel-purple-dark font-medium text-sm">오늘의 이야기</p>
                </div>
              )}

              {/* Page lines (behind content) */}
              <div className="absolute inset-x-6 top-10 bottom-10 pointer-events-none -z-10">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full"
                    style={{
                      height: '1px',
                      marginBottom: '16px',
                      background: 'rgba(0,0,0,0.025)',
                    }}
                  />
                ))}
              </div>

              {/* Page edge shadow */}
              <div
                className="absolute left-0 top-0 bottom-0 w-3"
                style={{
                  background: 'linear-gradient(to right, rgba(0,0,0,0.06), transparent)',
                }}
              />
            </div>

            {/* Spine */}
            <div
              className="absolute rounded-l-sm"
              style={{
                width: BOOK_DEPTH,
                height: BOOK_HEIGHT,
                background: `linear-gradient(to right, ${spineDarker}, ${spineColor})`,
                transform: `rotateY(-90deg) translateX(-${BOOK_DEPTH}px)`,
                transformOrigin: 'right center',
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                <span className="text-xs font-medium text-white/80 tracking-wider">
                  {diary?.title || `일기장 ${diary?.volume_number || 1}`}
                </span>
              </div>
              <div className="absolute top-3 left-0 right-0 h-px bg-white/20" />
              <div className="absolute bottom-3 left-0 right-0 h-px bg-white/20" />
            </div>

            {/* Pages edge (right side thickness) */}
            <div
              className="absolute"
              style={{
                width: BOOK_DEPTH - 4,
                height: BOOK_HEIGHT - 6,
                top: 3,
                background: 'linear-gradient(to right, #f5f5f0, #fffef9, #f5f5f0)',
                transform: `rotateY(90deg) translateZ(${BOOK_WIDTH}px) translateX(-${BOOK_DEPTH - 4}px)`,
                transformOrigin: 'left center',
                borderRadius: '0 2px 2px 0',
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full"
                  style={{ height: '1px', top: `${(i + 1) * 7}%`, background: 'rgba(0,0,0,0.02)' }}
                />
              ))}
            </div>

            {/* Back Cover */}
            <div
              className="absolute inset-0 rounded-r-lg"
              style={{
                background: spineDarker,
                transform: `translateZ(-${BOOK_DEPTH / 2}px)`,
              }}
            />
          </div>
        </div>

        {/* Shadow */}
        <div
          className="transition-all duration-700 mx-auto"
          style={{
            width: isOpening ? BOOK_WIDTH * 2 : BOOK_WIDTH * 0.85,
            height: 18,
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, transparent 70%)',
            filter: 'blur(8px)',
            marginTop: '15px',
          }}
        />
      </div>
    )
  }
)
