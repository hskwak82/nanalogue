'use client'

import { useState, useRef, useCallback } from 'react'
import { compressImage, isValidImageType, createThumbnail } from '@/lib/image/compress'

interface PhotoUploaderProps {
  diaryId?: string
  onPhotoSelected: (file: File, thumbnailUrl: string) => void
  disabled?: boolean
  maxPhotos?: number
  currentPhotoCount?: number
}

export function PhotoUploader({
  onPhotoSelected,
  disabled = false,
  maxPhotos = 5,
  currentPhotoCount = 0,
}: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remainingPhotos = maxPhotos - currentPhotoCount
  const canUpload = remainingPhotos > 0 && !disabled

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      // Validate file type
      if (!isValidImageType(file)) {
        setError('JPG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.')
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('파일 크기는 5MB 이하여야 합니다.')
        return
      }

      setIsProcessing(true)

      try {
        // Create thumbnail for preview
        const thumbnailBlob = await createThumbnail(file, 200)
        const thumbnailUrl = URL.createObjectURL(thumbnailBlob)

        onPhotoSelected(file, thumbnailUrl)
      } catch (err) {
        console.error('Photo processing error:', err)
        setError('이미지 처리 중 오류가 발생했습니다.')
      } finally {
        setIsProcessing(false)
      }
    },
    [onPhotoSelected]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (!canUpload) return

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [canUpload, handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    if (canUpload && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [canUpload])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
      // Reset input for re-selecting same file
      e.target.value = ''
    },
    [handleFile]
  )

  return (
    <div className="w-full">
      {/* Upload area */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative w-full h-32 border-2 border-dashed rounded-xl
          flex flex-col items-center justify-center gap-2
          transition-all cursor-pointer
          ${isDragging ? 'border-pastel-purple bg-pastel-purple/10' : 'border-gray-300'}
          ${canUpload ? 'hover:border-pastel-purple hover:bg-pastel-pink-light/30' : 'opacity-50 cursor-not-allowed'}
          ${isProcessing ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={!canUpload}
        />

        {isProcessing ? (
          <>
            <div className="w-8 h-8 border-2 border-pastel-purple border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">처리 중...</span>
          </>
        ) : (
          <>
            <div className="text-3xl">📷</div>
            <span className="text-sm text-gray-600">
              {canUpload ? '클릭하거나 드래그 하여 이미지 업로드' : '업로드 제한에 도달했습니다'}
            </span>
            <span className="text-xs text-gray-400">
              JPG, PNG, WebP (최대 5MB)
            </span>
          </>
        )}
      </div>

      {/* Photo count indicator */}
      <div className="mt-2 flex justify-between items-center text-xs">
        <span className="text-gray-500">
          {currentPhotoCount}/{maxPhotos} 사진
        </span>
        {remainingPhotos <= 2 && remainingPhotos > 0 && (
          <span className="text-amber-500">
            {remainingPhotos}장 남음
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {/* Premium upsell (when limit reached) */}
      {!canUpload && currentPhotoCount >= maxPhotos && (
        <div className="mt-3 p-3 bg-gradient-to-r from-pastel-purple/10 to-pastel-pink/10 rounded-lg">
          <p className="text-xs text-gray-600">
            🌟 프리미엄으로 업그레이드하면 무제한으로 사진을 추가할 수 있어요!
          </p>
        </div>
      )}
    </div>
  )
}
