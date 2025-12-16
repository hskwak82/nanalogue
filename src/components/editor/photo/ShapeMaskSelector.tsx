'use client'

import { ShapeType, SHAPE_MASKS } from '@/types/customization'

interface ShapeMaskSelectorProps {
  selectedShape: ShapeType | null
  onSelectShape: (shape: ShapeType) => void
  isPremium?: boolean
}

export function ShapeMaskSelector({
  selectedShape,
  onSelectShape,
  isPremium = false,
}: ShapeMaskSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {SHAPE_MASKS.map((shape) => {
        // TODO: 나중에 실제 프리미엄 체크로 변경
        // const isLocked = !shape.is_free && !isPremium
        const isLocked = false // 테스트를 위해 모두 잠금 해제
        const isPremiumShape = !shape.is_free && !isPremium
        const isSelected = selectedShape === shape.id

        return (
          <button
            key={shape.id}
            onClick={() => onSelectShape(shape.id)}
            className={`
              relative w-14 h-14 rounded-xl flex flex-col items-center justify-center
              transition-all cursor-pointer
              ${isSelected
                ? 'bg-pastel-purple text-white ring-2 ring-pastel-purple ring-offset-2'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }
            `}
            title={isPremiumShape ? '프리미엄 기능 (테스트 중 무료)' : shape.name}
          >
            <span className="text-2xl">{shape.icon}</span>
            <span className="text-[10px] mt-0.5">{shape.name}</span>

            {/* Premium indicator (but not locked) */}
            {isPremiumShape && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                <span className="text-xs">✨</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Shape preview component
interface ShapePreviewProps {
  imageUrl: string
  shape: ShapeType
  size?: number
}

export function ShapePreview({ imageUrl, shape, size = 200 }: ShapePreviewProps) {
  const getClipPath = (shapeType: ShapeType): string => {
    switch (shapeType) {
      case 'circle':
        return 'circle(50% at 50% 50%)'
      case 'square':
        return 'inset(0)'
      case 'diamond':
        return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
      case 'heart':
        // Heart shape using clip-path
        return 'path("M 100 180 C 20 120 0 70 0 50 C 0 20 30 0 60 0 C 80 0 100 15 100 40 C 100 15 120 0 140 0 C 170 0 200 20 200 50 C 200 70 180 120 100 180 Z")'
      case 'star':
        return 'polygon(50% 0%, 61% 38%, 100% 38%, 69% 62%, 80% 100%, 50% 76%, 20% 100%, 31% 62%, 0% 38%, 39% 38%)'
      default:
        return 'circle(50% at 50% 50%)'
    }
  }

  return (
    <div
      className="relative overflow-hidden bg-gray-100"
      style={{
        width: size,
        height: size,
        clipPath: getClipPath(shape),
      }}
    >
      <img
        src={imageUrl}
        alt="Preview"
        className="w-full h-full object-cover"
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  )
}
