'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ThumbnailCropData, ThumbnailCropType } from '@/types/database'

interface ThumbnailCropModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  sessionId: string
  currentCropData?: ThumbnailCropData | null
  onSave: (cropData: ThumbnailCropData) => Promise<void>
}

const CROP_TYPES: { type: ThumbnailCropType; label: string; description: string }[] = [
  { type: 'center', label: '자동 중앙', description: '이미지 중앙을 자동으로 선택' },
  { type: 'smart', label: 'AI 스마트', description: '주요 피사체를 자동 감지 (예정)' },
  { type: 'manual', label: '직접 선택', description: '원하는 영역을 드래그하여 선택' },
]

export function ThumbnailCropModal({
  isOpen,
  onClose,
  imageUrl,
  sessionId,
  currentCropData,
  onSave,
}: ThumbnailCropModalProps) {
  const [selectedType, setSelectedType] = useState<ThumbnailCropType>(
    currentCropData?.type || 'center'
  )
  const [cropArea, setCropArea] = useState(
    currentCropData?.crop || { x: 0, y: 0, width: 100, height: 100 }
  )
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Calculate center crop for the image
  const calculateCenterCrop = useCallback(() => {
    if (!imageDimensions.width || !imageDimensions.height) return

    const { width, height } = imageDimensions
    const size = Math.min(width, height)

    setCropArea({
      x: ((width - size) / 2 / width) * 100,
      y: ((height - size) / 2 / height) * 100,
      width: (size / width) * 100,
      height: (size / height) * 100,
    })
  }, [imageDimensions])

  // Apply center crop when type changes to center
  useEffect(() => {
    if (selectedType === 'center' && imageLoaded) {
      calculateCenterCrop()
    } else if (selectedType === 'smart' && imageLoaded) {
      // For now, smart uses center crop (placeholder)
      calculateCenterCrop()
    }
  }, [selectedType, imageLoaded, calculateCenterCrop])

  // Handle image load
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      })
      setImageLoaded(true)
    }
  }

  // Manual crop drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedType !== 'manual') return
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setIsDragging(true)
    setDragStart({ x, y })
    setCropArea({ x, y, width: 0, height: 0 })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || selectedType !== 'manual') return
      if (!imageContainerRef.current) return

      const rect = imageContainerRef.current.getBoundingClientRect()
      const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))

      // Calculate square crop area
      const dx = currentX - dragStart.x
      const dy = currentY - dragStart.y
      const size = Math.max(Math.abs(dx), Math.abs(dy))

      const x = dx >= 0 ? dragStart.x : Math.max(0, dragStart.x - size)
      const y = dy >= 0 ? dragStart.y : Math.max(0, dragStart.y - size)

      // Clamp to image bounds
      const clampedSize = Math.min(size, 100 - x, 100 - y)

      setCropArea({
        x,
        y,
        width: clampedSize,
        height: clampedSize,
      })
    },
    [isDragging, selectedType, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add global mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Handle save
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        type: selectedType,
        crop: cropArea,
      })
      onClose()
    } catch (error) {
      console.error('Failed to save crop:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">캘린더 썸네일 영역 선택</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Crop type selector */}
          <div className="flex gap-2">
            {CROP_TYPES.map(({ type, label, description }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  selectedType === type
                    ? 'bg-pastel-purple text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={description}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Image with crop overlay */}
          <div
            ref={imageContainerRef}
            className={`relative bg-gray-100 rounded-xl overflow-hidden ${
              selectedType === 'manual' ? 'cursor-crosshair' : ''
            }`}
            onMouseDown={handleMouseDown}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="원본 이미지"
              className="w-full h-auto max-h-64 object-contain"
              onLoad={handleImageLoad}
            />

            {/* Darkened overlay outside crop area */}
            {imageLoaded && cropArea.width > 0 && (
              <>
                {/* Top */}
                <div
                  className="absolute bg-black/50 left-0 right-0 top-0"
                  style={{ height: `${cropArea.y}%` }}
                />
                {/* Bottom */}
                <div
                  className="absolute bg-black/50 left-0 right-0 bottom-0"
                  style={{ height: `${100 - cropArea.y - cropArea.height}%` }}
                />
                {/* Left */}
                <div
                  className="absolute bg-black/50 left-0"
                  style={{
                    top: `${cropArea.y}%`,
                    width: `${cropArea.x}%`,
                    height: `${cropArea.height}%`,
                  }}
                />
                {/* Right */}
                <div
                  className="absolute bg-black/50 right-0"
                  style={{
                    top: `${cropArea.y}%`,
                    width: `${100 - cropArea.x - cropArea.width}%`,
                    height: `${cropArea.height}%`,
                  }}
                />
                {/* Crop area border */}
                <div
                  className="absolute border-2 border-white rounded pointer-events-none"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.width}%`,
                    height: `${cropArea.height}%`,
                  }}
                />
              </>
            )}

            {/* Instructions for manual mode */}
            {selectedType === 'manual' && !isDragging && cropArea.width === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-black/30">
                <p className="text-sm">드래그하여 영역을 선택하세요</p>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">미리보기:</span>
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              {imageLoaded && cropArea.width > 0 && (
                <img
                  src={imageUrl}
                  alt="미리보기"
                  className="absolute"
                  style={{
                    width: `${100 / (cropArea.width / 100)}%`,
                    height: `${100 / (cropArea.height / 100)}%`,
                    left: `${-cropArea.x / (cropArea.width / 100)}%`,
                    top: `${-cropArea.y / (cropArea.height / 100)}%`,
                  }}
                />
              )}
            </div>
            <span className="text-xs text-gray-400">캘린더에 이렇게 표시됩니다</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isSaving}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || cropArea.width === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-pastel-purple rounded-lg hover:bg-pastel-purple-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
