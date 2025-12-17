'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface SpineRegionSelectorProps {
  coverImageUrl: string | null
  coverRef: React.RefObject<HTMLDivElement | null> // Reference to the cover element for overlay
  spineWidthRatio?: number // Ratio of spine width to cover width (default 0.1 = 10%)
  initialPosition?: number // Initial X position as percentage (0-100)
  onPositionChange?: (position: number) => void
  className?: string
}

// Spine width as ratio of cover width
const DEFAULT_SPINE_WIDTH_RATIO = 0.1 // 10% of cover width for more realistic spine

export function SpineRegionSelector({
  coverImageUrl,
  coverRef,
  spineWidthRatio = DEFAULT_SPINE_WIDTH_RATIO,
  initialPosition = 0,
  onPositionChange,
  className = '',
}: SpineRegionSelectorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState(initialPosition) // X position as percentage (0-100)

  // Max position is 100 - spineWidthRatio * 100 (so spine doesn't go off the right edge)
  const maxPosition = 100 - spineWidthRatio * 100

  const updatePosition = useCallback((clientX: number) => {
    if (!coverRef.current) return

    const rect = coverRef.current.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const percentage = (relativeX / rect.width) * 100

    // Clamp position so spine selector stays within bounds
    const halfSpinePercent = (spineWidthRatio * 100) / 2
    const clampedPosition = Math.max(0, Math.min(maxPosition, percentage - halfSpinePercent))

    setPosition(clampedPosition)
    onPositionChange?.(clampedPosition)
  }, [coverRef, maxPosition, spineWidthRatio, onPositionChange])

  const handleOverlayMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    updatePosition(e.clientX)
  }, [updatePosition])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    updatePosition(e.clientX)
  }, [isDragging, updatePosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    updatePosition(e.touches[0].clientX)
  }, [updatePosition])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    updatePosition(e.touches[0].clientX)
  }, [isDragging, updatePosition])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // Close editing when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isEditing) return
      const target = e.target as HTMLElement
      // Check if click is outside the spine preview and cover
      if (!target.closest('[data-spine-selector]') && !target.closest('[data-cover-editor]')) {
        setIsEditing(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing])

  if (!coverImageUrl) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div
          className="rounded-sm bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center"
          style={{ width: 32, height: 400 }}
        >
          <span className="text-xs text-gray-400 writing-vertical" style={{ writingMode: 'vertical-rl' }}>
            저장 후 표시
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`absolute -right-12 top-0 flex flex-col items-center gap-2 ${className}`} data-spine-selector>
      <span className="text-[10px] text-gray-400">책장</span>

      {/* Spine Preview - positioned to the right of cover */}
      <div
        onClick={() => setIsEditing(!isEditing)}
        className={`rounded-sm shadow-md overflow-hidden cursor-pointer transition-all ${
          isEditing ? 'ring-2 ring-pastel-purple' : 'hover:ring-2 hover:ring-gray-300'
        }`}
        style={{
          width: 30,
          height: 400,
          backgroundImage: `url(${coverImageUrl})`,
          backgroundSize: `${100 / spineWidthRatio}% 100%`,
          backgroundPosition: `${maxPosition > 0 ? (position / maxPosition) * 100 : 0}% center`,
        }}
        title="클릭하여 영역 조절"
      />

      {isEditing && (
        <span className="text-[9px] text-pastel-purple whitespace-nowrap">드래그</span>
      )}

      {/* Selection overlay on cover - only shown when editing */}
      {isEditing && (
        <div
          className="fixed inset-0 z-40"
          style={{ pointerEvents: 'none' }}
        >
          {/* Clickable overlay that covers the cover editor area */}
          {coverRef.current && (() => {
            const rect = coverRef.current.getBoundingClientRect()
            return (
              <div
                className="absolute cursor-ew-resize"
                style={{
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  pointerEvents: 'auto',
                }}
                onMouseDown={handleOverlayMouseDown}
                onTouchStart={handleTouchStart}
              >
                {/* Darkening overlay for non-selected areas */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-lg"
                  style={{
                    background: `linear-gradient(to right,
                      rgba(0,0,0,0.4) 0%,
                      rgba(0,0,0,0.4) ${position}%,
                      transparent ${position}%,
                      transparent ${position + spineWidthRatio * 100}%,
                      rgba(0,0,0,0.4) ${position + spineWidthRatio * 100}%,
                      rgba(0,0,0,0.4) 100%
                    )`,
                  }}
                />

                {/* Selection frame */}
                <div
                  className="absolute top-0 bottom-0 border-2 border-pastel-purple pointer-events-none"
                  style={{
                    left: `${position}%`,
                    width: `${spineWidthRatio * 100}%`,
                    boxShadow: '0 0 0 2px rgba(167, 139, 250, 0.3)',
                  }}
                >
                  {/* Drag indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/95 rounded-full px-2 py-1 shadow-lg">
                      <span className="text-xs text-pastel-purple font-medium">⇔</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// Helper to get crop coordinates for spine image capture
export function getSpineCropCoordinates(
  position: number, // percentage 0-100
  spineWidthRatio: number,
  coverWidth: number,
  coverHeight: number
): { x: number; y: number; width: number; height: number } {
  const x = (position / 100) * coverWidth
  const width = coverWidth * spineWidthRatio

  return {
    x: Math.round(x),
    y: 0,
    width: Math.round(width),
    height: coverHeight,
  }
}
