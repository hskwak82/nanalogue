'use client'

import { useRef } from 'react'
import { CoverTemplate, PlacedDecoration } from '@/types/customization'
import { useDragAndDrop } from '@/lib/editor/useDragAndDrop'
import { DraggableItem } from './DraggableItem'

interface CoverEditorProps {
  template: CoverTemplate | null
  decorations: PlacedDecoration[]
  selectedIndex: number | null
  onUpdate: (index: number, updates: Partial<PlacedDecoration>) => void
  onSelect: (index: number | null) => void
  onRemove: (index: number) => void
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

export function CoverEditor({
  template,
  decorations,
  selectedIndex,
  onUpdate,
  onSelect,
  onRemove,
}: CoverEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    isDragging,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onCanvasClick,
    adjustScale,
    adjustRotation,
  } = useDragAndDrop({
    containerRef,
    decorations,
    selectedIndex,
    onUpdate,
    onSelect,
  })

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
    <div className="flex flex-col gap-4">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative mx-auto rounded-lg shadow-lg overflow-hidden cursor-crosshair"
        style={{
          width: 300,
          height: 400,
          ...coverStyle,
        }}
        onClick={onCanvasClick}
        onMouseMove={isDragging ? onMouseMove : undefined}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={isDragging ? onTouchMove : undefined}
        onTouchEnd={onTouchEnd}
      >
        {/* Decorations */}
        {decorations.map((decoration, index) => (
          <DraggableItem
            key={index}
            decoration={decoration}
            isSelected={selectedIndex === index}
            onMouseDown={onMouseDown(index)}
            onTouchStart={onTouchStart(index)}
          />
        ))}

        {/* Book spine effect */}
        <div
          className="absolute left-0 top-0 bottom-0 w-3 opacity-20 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)',
          }}
        />

        {/* Corner fold effect */}
        <div
          className="absolute right-0 bottom-0 w-8 h-8 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.05) 50%)',
          }}
        />
      </div>

      {/* Selected Item Controls */}
      {selectedIndex !== null && (
        <div className="flex items-center justify-center gap-4 p-3 bg-white/80 rounded-lg shadow-sm">
          {/* Scale controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">크기</span>
            <button
              onClick={() => adjustScale(-0.1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              -
            </button>
            <span className="text-sm w-12 text-center">
              {(decorations[selectedIndex]?.scale * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => adjustScale(0.1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              +
            </button>
          </div>

          {/* Rotation controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">회전</span>
            <button
              onClick={() => adjustRotation(-15)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <span className="text-sm w-12 text-center">
              {decorations[selectedIndex]?.rotation.toFixed(0)}°
            </span>
            <button
              onClick={() => adjustRotation(15)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 transform scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          </div>

          {/* Delete button */}
          <button
            onClick={() => onRemove(selectedIndex)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
