'use client'

import { PlacedDecoration } from '@/types/customization'

interface DraggableItemProps {
  decoration: PlacedDecoration
  isSelected: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
}

export function DraggableItem({
  decoration,
  isSelected,
  onMouseDown,
  onTouchStart,
}: DraggableItemProps) {
  return (
    <div
      className={`absolute cursor-move select-none ${
        isSelected ? 'z-50' : ''
      }`}
      style={{
        left: `${decoration.x}%`,
        top: `${decoration.y}%`,
        transform: `translate(-50%, -50%) scale(${decoration.scale}) rotate(${decoration.rotation}deg)`,
        zIndex: isSelected ? 1000 : decoration.z_index,
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -inset-2 border-2 border-dashed border-pastel-purple rounded-lg pointer-events-none" />
      )}

      {/* Content */}
      {decoration.type === 'emoji' ? (
        <span className="text-4xl">{decoration.content}</span>
      ) : (
        <span
          className="block w-10 h-10 text-pastel-purple-dark"
          dangerouslySetInnerHTML={{ __html: decoration.content }}
        />
      )}
    </div>
  )
}
