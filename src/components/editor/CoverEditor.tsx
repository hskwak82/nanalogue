'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { CoverTemplate, PlacedDecoration, MIN_SCALE, MAX_SCALE, ShapeType, FONT_OPTIONS } from '@/types/customization'
import { DraggableItem } from './DraggableItem'

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

interface CoverEditorProps {
  template: CoverTemplate | null
  decorations: PlacedDecoration[]
  selectedIndex: number | null
  onUpdate: (index: number, updates: Partial<PlacedDecoration>) => void
  onSelect: (index: number | null) => void
  onRemove: (index: number) => void
  isTextMode?: boolean
  onCanvasClick?: (x: number, y: number) => void
  onTextDoubleClick?: (index: number) => void
}

type DragMode = 'none' | 'move' | 'resize' | 'rotate'

interface DragState {
  mode: DragMode
  startX: number
  startY: number
  itemStartX: number
  itemStartY: number
  itemStartScale: number
  itemStartRotation: number
  resizeCorner: string
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
  isTextMode = false,
  onCanvasClick,
  onTextDoubleClick,
}: CoverEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragIndexRef = useRef<number | null>(null)

  const [dragState, setDragState] = useState<DragState>({
    mode: 'none',
    startX: 0,
    startY: 0,
    itemStartX: 0,
    itemStartY: 0,
    itemStartScale: 1,
    itemStartRotation: 0,
    resizeCorner: '',
  })

  // Get item center position in pixels
  const getItemCenter = useCallback((index: number) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    const item = decorations[index]
    return {
      x: rect.left + (item.x / 100) * rect.width,
      y: rect.top + (item.y / 100) * rect.height,
    }
  }, [decorations])

  // Handle move start
  const handleMoveStart = useCallback((index: number, clientX: number, clientY: number) => {
    onSelect(index)
    dragIndexRef.current = index
    const item = decorations[index]

    setDragState({
      mode: 'move',
      startX: clientX,
      startY: clientY,
      itemStartX: item.x,
      itemStartY: item.y,
      itemStartScale: item.scale,
      itemStartRotation: item.rotation,
      resizeCorner: '',
    })
  }, [decorations, onSelect])

  // Handle resize start
  const handleResizeStart = useCallback((index: number, clientX: number, clientY: number, corner: string) => {
    dragIndexRef.current = index
    const item = decorations[index]

    setDragState({
      mode: 'resize',
      startX: clientX,
      startY: clientY,
      itemStartX: item.x,
      itemStartY: item.y,
      itemStartScale: item.scale,
      itemStartRotation: item.rotation,
      resizeCorner: corner,
    })
  }, [decorations])

  // Handle rotate start
  const handleRotateStart = useCallback((index: number, clientX: number, clientY: number) => {
    dragIndexRef.current = index
    const item = decorations[index]

    setDragState({
      mode: 'rotate',
      startX: clientX,
      startY: clientY,
      itemStartX: item.x,
      itemStartY: item.y,
      itemStartScale: item.scale,
      itemStartRotation: item.rotation,
      resizeCorner: '',
    })
  }, [decorations])

  // Handle mouse move (native event for document listener)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragState.mode === 'none' || dragIndexRef.current === null) return
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const index = dragIndexRef.current

    if (dragState.mode === 'move') {
      const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100
      const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100

      const newX = Math.max(5, Math.min(95, dragState.itemStartX + deltaX))
      const newY = Math.max(5, Math.min(95, dragState.itemStartY + deltaY))

      onUpdate(index, { x: newX, y: newY })
    } else if (dragState.mode === 'resize') {
      // Calculate distance from item center
      const center = getItemCenter(index)
      const startDist = Math.sqrt(
        Math.pow(dragState.startX - center.x, 2) +
        Math.pow(dragState.startY - center.y, 2)
      )
      const currentDist = Math.sqrt(
        Math.pow(e.clientX - center.x, 2) +
        Math.pow(e.clientY - center.y, 2)
      )

      const scaleFactor = currentDist / startDist
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, dragState.itemStartScale * scaleFactor))

      onUpdate(index, { scale: newScale })
    } else if (dragState.mode === 'rotate') {
      // Calculate angle from item center
      const center = getItemCenter(index)
      const startAngle = Math.atan2(
        dragState.startY - center.y,
        dragState.startX - center.x
      ) * (180 / Math.PI)
      const currentAngle = Math.atan2(
        e.clientY - center.y,
        e.clientX - center.x
      ) * (180 / Math.PI)

      let newRotation = dragState.itemStartRotation + (currentAngle - startAngle)
      // Normalize to -180 to 180
      while (newRotation > 180) newRotation -= 360
      while (newRotation < -180) newRotation += 360

      onUpdate(index, { rotation: newRotation })
    }
  }, [dragState, onUpdate, getItemCenter])

  // Handle mouse up (native event for document listener)
  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({ ...prev, mode: 'none' }))
    dragIndexRef.current = null
  }, [])

  // Document-level event listeners for drag operations
  useEffect(() => {
    if (dragState.mode !== 'none') {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState.mode, handleMouseMove, handleMouseUp])

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (isTextMode && onCanvasClick && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        onCanvasClick(Math.max(5, Math.min(95, x)), Math.max(5, Math.min(95, y)))
      } else {
        onSelect(null)
      }
    }
  }, [onSelect, isTextMode, onCanvasClick])

  // Mouse event handlers for items
  const onItemMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleMoveStart(index, e.clientX, e.clientY)
  }, [handleMoveStart])

  const onItemTouchStart = useCallback((index: number) => (e: React.TouchEvent) => {
    e.stopPropagation()
    const touch = e.touches[0]
    handleMoveStart(index, touch.clientX, touch.clientY)
  }, [handleMoveStart])

  const onResizeStart = useCallback((index: number) => (e: React.MouseEvent, corner: string) => {
    e.preventDefault()
    handleResizeStart(index, e.clientX, e.clientY, corner)
  }, [handleResizeStart])

  const onRotateStart = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    handleRotateStart(index, e.clientX, e.clientY)
  }, [handleRotateStart])

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
      {/* Canvas wrapper - allows handles to overflow */}
      <div
        className="relative mx-auto"
        style={{ width: 300, height: 400 }}
      >
        {/* Canvas - clips decoration content */}
        <div
          ref={containerRef}
          className={`absolute inset-0 rounded-lg shadow-lg overflow-hidden ${
            isTextMode ? 'cursor-text ring-2 ring-pastel-purple/50' : 'cursor-crosshair'
          }`}
          style={coverStyle}
          onClick={handleCanvasClick}
        >
          {/* Decoration content only (clipped) */}
          {decorations.map((decoration, index) => (
            <div
              key={`content-${index}`}
              className="absolute select-none pointer-events-none"
              style={{
                left: `${decoration.x}%`,
                top: `${decoration.y}%`,
                transform: `translate(-50%, -50%) scale(${decoration.scale}) rotate(${decoration.rotation}deg)`,
                zIndex: selectedIndex === index ? 1000 : decoration.z_index,
              }}
            >
              {decoration.type === 'emoji' ? (
                <span className="text-4xl">{decoration.content}</span>
              ) : decoration.type === 'photo' ? (
                <img
                  src={decoration.content}
                  alt="Photo decoration"
                  className="w-20 h-20 object-cover"
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
                  className="block w-10 h-10 text-pastel-purple-dark"
                  dangerouslySetInnerHTML={{ __html: decoration.content }}
                />
              )}
            </div>
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

        {/* Interactive handles layer (outside clipped area) */}
        {decorations.map((decoration, index) => (
          <div
            key={`handle-${index}`}
            className={`absolute cursor-move ${selectedIndex === index ? 'z-50' : ''}`}
            style={{
              left: `${decoration.x}%`,
              top: `${decoration.y}%`,
              transform: `translate(-50%, -50%)`,
              zIndex: selectedIndex === index ? 1001 : decoration.z_index,
            }}
            onMouseDown={onItemMouseDown(index)}
            onTouchStart={onItemTouchStart(index)}
            onDoubleClick={(e) => {
              if (decoration.type === 'text' && onTextDoubleClick) {
                e.preventDefault()
                e.stopPropagation()
                onTextDoubleClick(index)
              }
            }}
          >
            {/* Invisible hit area for dragging */}
            <div
              className="relative"
              style={{
                width: decoration.type === 'emoji' ? 40 : 40,
                height: decoration.type === 'emoji' ? 40 : 40,
                transform: `scale(${decoration.scale}) rotate(${decoration.rotation}deg)`,
              }}
            />

            {/* Selection handles */}
            {selectedIndex === index && (
              <>
                {/* Border */}
                <div
                  className="absolute border-2 border-pastel-purple rounded-lg pointer-events-none"
                  style={{
                    width: 50 * decoration.scale,
                    height: 50 * decoration.scale,
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) rotate(${decoration.rotation}deg)`,
                  }}
                />

                {/* Corner resize handles */}
                {['nw', 'ne', 'sw', 'se'].map((corner) => {
                  const halfSize = 25 * decoration.scale
                  const rad = (decoration.rotation * Math.PI) / 180
                  const cos = Math.cos(rad)
                  const sin = Math.sin(rad)

                  let localX = corner.includes('e') ? halfSize : -halfSize
                  let localY = corner.includes('s') ? halfSize : -halfSize

                  const rotatedX = localX * cos - localY * sin
                  const rotatedY = localX * sin + localY * cos

                  return (
                    <div
                      key={corner}
                      className="absolute w-4 h-4 bg-white border-2 border-pastel-purple rounded-full cursor-nwse-resize hover:bg-pastel-purple-light transition-colors"
                      style={{
                        left: `calc(50% + ${rotatedX}px)`,
                        top: `calc(50% + ${rotatedY}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleResizeStart(index, e.clientX, e.clientY, corner)
                      }}
                    />
                  )
                })}

                {/* Rotation handle */}
                {(() => {
                  const distance = 25 * decoration.scale + 30
                  const rad = (decoration.rotation * Math.PI) / 180
                  const rotatedX = 0 * Math.cos(rad) - (-distance) * Math.sin(rad)
                  const rotatedY = 0 * Math.sin(rad) + (-distance) * Math.cos(rad)

                  return (
                    <div
                      className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing"
                      style={{
                        left: `calc(50% + ${rotatedX}px)`,
                        top: `calc(50% + ${rotatedY}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRotateStart(index, e.clientX, e.clientY)
                      }}
                    >
                      <div className="w-5 h-5 bg-white border-2 border-pastel-purple rounded-full flex items-center justify-center hover:bg-pastel-purple-light transition-colors">
                        <svg className="w-3 h-3 text-pastel-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12a9 9 0 1 0 9-9" strokeLinecap="round" />
                          <path d="M3 3v6h6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Selected Item Info & Delete */}
      {selectedIndex !== null && decorations[selectedIndex] && (
        <div className="flex items-center justify-center gap-4 p-3 bg-white/80 rounded-lg shadow-sm">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>크기: {(decorations[selectedIndex].scale * 100).toFixed(0)}%</span>
            <span>회전: {decorations[selectedIndex].rotation.toFixed(0)}°</span>
          </div>

          {/* Delete button */}
          <button
            onClick={() => onRemove(selectedIndex)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Instructions */}
      <p className="text-xs text-gray-400 text-center">
        드래그: 이동 | 모서리: 크기 조절 | 상단 원: 회전
      </p>
    </div>
  )
}
