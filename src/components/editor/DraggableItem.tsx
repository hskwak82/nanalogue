'use client'

import { PlacedDecoration } from '@/types/customization'

interface DraggableItemProps {
  decoration: PlacedDecoration
  isSelected: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onResizeStart?: (e: React.MouseEvent, corner: string) => void
  onRotateStart?: (e: React.MouseEvent) => void
}

export function DraggableItem({
  decoration,
  isSelected,
  onMouseDown,
  onTouchStart,
  onResizeStart,
  onRotateStart,
}: DraggableItemProps) {
  const handleResizeMouseDown = (corner: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onResizeStart?.(e, corner)
  }

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRotateStart?.(e)
  }

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
      {/* Selection indicator with handles */}
      {isSelected && (
        <>
          {/* Border */}
          <div className="absolute -inset-3 border-2 border-pastel-purple rounded-lg pointer-events-none" />

          {/* Corner resize handles */}
          {['nw', 'ne', 'sw', 'se'].map((corner) => (
            <div
              key={corner}
              className={`absolute w-4 h-4 bg-white border-2 border-pastel-purple rounded-full cursor-${
                corner === 'nw' || corner === 'se' ? 'nwse' : 'nesw'
              }-resize hover:bg-pastel-purple-light transition-colors`}
              style={{
                top: corner.includes('n') ? '-0.75rem' : 'auto',
                bottom: corner.includes('s') ? '-0.75rem' : 'auto',
                left: corner.includes('w') ? '-0.75rem' : 'auto',
                right: corner.includes('e') ? '-0.75rem' : 'auto',
                transform: `scale(${1 / decoration.scale})`,
              }}
              onMouseDown={handleResizeMouseDown(corner)}
            />
          ))}

          {/* Rotation handle */}
          <div
            className="absolute -top-10 left-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing"
            style={{
              transform: `translateX(-50%) scale(${1 / decoration.scale})`,
            }}
            onMouseDown={handleRotateMouseDown}
          >
            {/* Line connecting to item */}
            <div className="w-0.5 h-4 bg-pastel-purple" />
            {/* Rotation circle */}
            <div className="w-5 h-5 bg-white border-2 border-pastel-purple rounded-full flex items-center justify-center hover:bg-pastel-purple-light transition-colors">
              <svg className="w-3 h-3 text-pastel-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9" strokeLinecap="round" />
                <path d="M3 3v6h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </>
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
