'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { PaperTemplate, PlacedDecoration, MIN_SCALE, MAX_SCALE, ShapeType } from '@/types/customization'

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

interface PaperEditorProps {
  template: PaperTemplate | null
  decorations: PlacedDecoration[]
  selectedIndex: number | null
  onUpdate: (index: number, updates: Partial<PlacedDecoration>) => void
  onSelect: (index: number | null) => void
  onRemove: (index: number) => void
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

// Get paper background styles
function getPaperStyle(template: PaperTemplate | null): React.CSSProperties {
  if (!template) {
    return {
      backgroundColor: '#FFFAF5',
    }
  }

  const baseStyle: React.CSSProperties = {
    backgroundColor: template.background_color,
  }

  // Add background image if exists
  if (template.background_image_url) {
    baseStyle.backgroundImage = `url(${template.background_image_url})`
    baseStyle.backgroundSize = 'cover'
  }

  // Add line patterns
  if (template.line_style !== 'none') {
    const lineColor = template.line_color || '#E5E5E5'

    switch (template.line_style) {
      case 'lined':
        baseStyle.backgroundImage = `repeating-linear-gradient(transparent, transparent 27px, ${lineColor} 27px, ${lineColor} 28px)`
        break
      case 'grid':
        baseStyle.backgroundImage = `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`
        baseStyle.backgroundSize = '28px 28px'
        break
      case 'dotted':
        baseStyle.backgroundImage = `radial-gradient(circle, ${lineColor} 1px, transparent 1px)`
        baseStyle.backgroundSize = '20px 20px'
        break
    }
  }

  return baseStyle
}

export function PaperEditor({
  template,
  decorations,
  selectedIndex,
  onUpdate,
  onSelect,
  onRemove,
}: PaperEditorProps) {
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

  // Handle mouse move
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
      while (newRotation > 180) newRotation -= 360
      while (newRotation < -180) newRotation += 360

      onUpdate(index, { rotation: newRotation })
    }
  }, [dragState, onUpdate, getItemCenter])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({ ...prev, mode: 'none' }))
    dragIndexRef.current = null
  }, [])

  // Document-level event listeners
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
      onSelect(null)
    }
  }, [onSelect])

  // Mouse event handlers
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

  const paperStyle = getPaperStyle(template)

  return (
    <div className="flex flex-col gap-4">
      {/* Paper preview wrapper */}
      <div
        className="relative mx-auto"
        style={{ width: 320, height: 400 }}
      >
        {/* Paper canvas */}
        <div
          ref={containerRef}
          className="absolute inset-0 rounded-lg shadow-lg overflow-hidden cursor-crosshair border border-gray-200"
          style={paperStyle}
          onClick={handleCanvasClick}
        >
          {/* Sample text to show paper effect */}
          <div className="absolute inset-4 pointer-events-none opacity-30">
            <p className="text-gray-600 text-sm leading-7">
              오늘 하루는 정말 좋았다. 아침에 일어나서 창문을 열었더니
              시원한 바람이 불어왔다. 커피 한 잔을 마시며 하루를
              시작했다...
            </p>
          </div>

          {/* Decoration content */}
          {decorations.map((decoration, index) => (
            <div
              key={`content-${index}`}
              className="absolute select-none pointer-events-none"
              style={{
                left: `${decoration.x}%`,
                top: `${decoration.y}%`,
                transform: `translate(-50%, -50%) scale(${decoration.scale}) rotate(${decoration.rotation}deg)`,
                zIndex: selectedIndex === index ? 1000 : decoration.z_index,
                opacity: 0.8, // Slight transparency for paper decorations
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
              ) : (
                <span
                  className="block w-10 h-10 text-pastel-purple-dark"
                  dangerouslySetInnerHTML={{ __html: decoration.content }}
                />
              )}
            </div>
          ))}

          {/* Paper fold effect */}
          <div
            className="absolute right-0 top-0 w-6 h-6 pointer-events-none"
            style={{
              background: 'linear-gradient(225deg, rgba(0,0,0,0.05) 50%, transparent 50%)',
            }}
          />
        </div>

        {/* Interactive handles layer */}
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
          >
            {/* Invisible hit area */}
            <div
              className="relative"
              style={{
                width: 40,
                height: 40,
                transform: `scale(${decoration.scale}) rotate(${decoration.rotation}deg)`,
              }}
            />

            {/* Selection handles */}
            {selectedIndex === index && (
              <>
                {/* Border */}
                <div
                  className="absolute border-2 border-pastel-mint rounded-lg pointer-events-none"
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
                      className="absolute w-4 h-4 bg-white border-2 border-pastel-mint rounded-full cursor-nwse-resize hover:bg-pastel-mint-light transition-colors"
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
                      <div className="w-5 h-5 bg-white border-2 border-pastel-mint rounded-full flex items-center justify-center hover:bg-pastel-mint-light transition-colors">
                        <svg className="w-3 h-3 text-pastel-mint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
