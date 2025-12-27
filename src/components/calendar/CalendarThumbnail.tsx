'use client'

import { useState } from 'react'
import type { ThumbnailCropData } from '@/types/database'

interface CalendarThumbnailProps {
  imageUrl: string
  cropData?: ThumbnailCropData | null
  size?: number
  className?: string
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: () => void
  onClick?: () => void
}

export function CalendarThumbnail({
  imageUrl,
  cropData,
  size = 32,
  className = '',
  onMouseEnter,
  onMouseLeave,
  onClick,
}: CalendarThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Calculate object-position based on crop data
  const getObjectPosition = () => {
    if (!cropData?.crop) {
      return 'center center'
    }

    const { x, y, width, height } = cropData.crop
    // Calculate center point of crop area
    const centerX = x + width / 2
    const centerY = y + height / 2
    return `${centerX}% ${centerY}%`
  }

  // Calculate scale based on crop area (to zoom into cropped region)
  const getTransform = () => {
    if (!cropData?.crop) {
      return 'none'
    }

    const { width, height } = cropData.crop
    // Scale inversely proportional to crop size
    const scaleX = 100 / width
    const scaleY = 100 / height
    const scale = Math.min(scaleX, scaleY, 3) // Cap at 3x zoom
    return `scale(${scale})`
  }

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden rounded cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
      <img
        src={imageUrl}
        alt=""
        className="w-full h-full object-cover transition-opacity"
        style={{
          opacity: isLoading ? 0 : 1,
          objectPosition: getObjectPosition(),
          transform: getTransform(),
          transformOrigin: getObjectPosition(),
        }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
      />
    </div>
  )
}
