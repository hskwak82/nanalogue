'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface SpineRegionSelectorProps {
  coverImageUrl: string | null
  coverWidth: number
  coverHeight: number
  spineWidthRatio?: number // Ratio of spine width to cover width (default 0.2 = 20%)
  initialPosition?: number // Initial X position as percentage (0-100)
  onPositionChange?: (position: number) => void
  className?: string
}

// Spine width as ratio of cover width
const DEFAULT_SPINE_WIDTH_RATIO = 0.25 // 25% of cover width

export function SpineRegionSelector({
  coverImageUrl,
  coverWidth,
  coverHeight,
  spineWidthRatio = DEFAULT_SPINE_WIDTH_RATIO,
  initialPosition = 0,
  onPositionChange,
  className = '',
}: SpineRegionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState(initialPosition) // X position as percentage (0-100)

  // Calculate display dimensions (scale down for preview)
  const previewScale = 0.5
  const displayWidth = coverWidth * previewScale
  const displayHeight = coverHeight * previewScale
  const spineWidth = displayWidth * spineWidthRatio

  // Max position is 100 - spineWidthRatio * 100 (so spine doesn't go off the right edge)
  const maxPosition = 100 - spineWidthRatio * 100

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const percentage = (relativeX / rect.width) * 100

    // Clamp position so spine selector stays within bounds
    // Adjust for spine width center point
    const halfSpinePercent = (spineWidthRatio * 100) / 2
    const clampedPosition = Math.max(0, Math.min(maxPosition, percentage - halfSpinePercent))

    setPosition(clampedPosition)
    onPositionChange?.(clampedPosition)
  }, [maxPosition, spineWidthRatio, onPositionChange])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
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

  if (!coverImageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ width: displayWidth, height: displayHeight }}>
        <p className="text-sm text-gray-400">표지를 먼저 저장해주세요</p>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">책장 미리보기 영역</span>
        <span className="text-xs text-gray-400">좌우로 드래그</span>
      </div>

      {/* Cover preview with selection overlay */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden shadow-md cursor-ew-resize select-none"
        style={{ width: displayWidth, height: displayHeight }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Cover image */}
        <img
          src={coverImageUrl}
          alt="Cover preview"
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />

        {/* Darkening overlay for non-selected areas */}
        <div
          className="absolute inset-0 bg-black/40 pointer-events-none"
          style={{
            clipPath: `polygon(
              0% 0%,
              ${position}% 0%,
              ${position}% 100%,
              0% 100%,
              0% 0%,
              ${position + spineWidthRatio * 100}% 0%,
              100% 0%,
              100% 100%,
              ${position + spineWidthRatio * 100}% 100%,
              ${position + spineWidthRatio * 100}% 0%
            )`,
          }}
        />

        {/* Selection frame */}
        <div
          className="absolute top-0 bottom-0 border-2 border-pastel-purple rounded-sm pointer-events-none"
          style={{
            left: `${position}%`,
            width: `${spineWidthRatio * 100}%`,
            boxShadow: '0 0 0 2px rgba(167, 139, 250, 0.3)',
          }}
        >
          {/* Drag handles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 rounded-full px-2 py-1 shadow-sm">
              <span className="text-[10px] text-gray-500">⇔</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spine preview */}
      <div className="flex items-center gap-3 mt-3">
        <span className="text-xs text-gray-500">미리보기:</span>
        <div
          className="rounded-sm shadow-md overflow-hidden border border-gray-200"
          style={{
            width: 32,
            height: 140,
            backgroundImage: `url(${coverImageUrl})`,
            backgroundSize: `${100 / spineWidthRatio}% 100%`,
            backgroundPosition: `${position / maxPosition * 100}% center`,
          }}
        />
      </div>
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
