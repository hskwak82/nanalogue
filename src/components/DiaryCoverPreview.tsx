'use client'

import Link from 'next/link'
import { CoverTemplate, PlacedDecoration } from '@/types/customization'

interface DiaryCoverPreviewProps {
  template: CoverTemplate | null
  decorations: PlacedDecoration[]
  userName?: string
}

// Parse cover image_url
function parseImageUrl(imageUrl: string) {
  if (imageUrl.startsWith('gradient:')) {
    return { type: 'gradient' as const, value: imageUrl.replace('gradient:', '') }
  }
  if (imageUrl.startsWith('solid:')) {
    return { type: 'solid' as const, value: imageUrl.replace('solid:', '') }
  }
  return { type: 'image' as const, value: imageUrl }
}

export function DiaryCoverPreview({
  template,
  decorations,
  userName,
}: DiaryCoverPreviewProps) {
  // Default cover style
  const defaultStyle = {
    background: 'linear-gradient(135deg, #E8E0F0 0%, #D4C5E2 50%, #C9B8DA 100%)',
  }

  // Parse template
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
    <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-pink/30">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">나의 일기장</h2>
        <Link
          href="/customize"
          className="text-sm font-medium text-pastel-purple hover:text-pastel-purple-dark transition-colors"
        >
          꾸미기
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Cover - Click to enter diary */}
        <Link href="/diary" className="group">
          <div
            className="relative rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
            style={{
              width: 120,
              height: 160,
              ...coverStyle,
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
                  transform: `translate(-50%, -50%) scale(${decoration.scale * 0.6}) rotate(${decoration.rotation}deg)`,
                  zIndex: decoration.z_index,
                  fontSize: '1.2rem',
                }}
              >
                {decoration.type === 'emoji' ? (
                  <span>{decoration.content}</span>
                ) : (
                  <span
                    className="block text-pastel-purple-dark"
                    style={{ width: '20px', height: '20px' }}
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

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium drop-shadow-lg">
                열기
              </span>
            </div>
          </div>
        </Link>

        {/* Label */}
        {userName && (
          <p className="text-sm text-gray-500">{userName}의 일기장</p>
        )}
      </div>
    </div>
  )
}
