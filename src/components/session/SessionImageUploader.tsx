'use client'

import { useState, useRef, useCallback } from 'react'
import { isValidImageType, compressImage } from '@/lib/image/compress'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface SessionImageUploaderProps {
  onImageSelected: (file: File, previewUrl: string) => void
  onImageRemoved: () => void
  previewUrl: string | null
  disabled?: boolean
  className?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB (will be compressed)
const MAX_DIMENSION = 1024 // Resize for API cost optimization

export function SessionImageUploader({
  onImageSelected,
  onImageRemoved,
  previewUrl,
  disabled = false,
  className = '',
}: SessionImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      if (!isValidImageType(file)) {
        setError('JPG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.')
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('파일 크기는 10MB 이하여야 합니다.')
        return
      }

      setIsProcessing(true)

      try {
        // Compress and resize image for AI API optimization
        const compressed = await compressImage(file, {
          maxDimension: MAX_DIMENSION,
          quality: 0.85,
          format: 'jpeg',
        })

        // Create a new File from the compressed blob
        const compressedFile = new File([compressed.blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
          type: 'image/jpeg',
        })

        // Create preview URL
        const previewUrl = URL.createObjectURL(compressed.blob)

        onImageSelected(compressedFile, previewUrl)
      } catch (err) {
        console.error('Image processing error:', err)
        setError('이미지 처리 중 오류가 발생했습니다.')
      } finally {
        setIsProcessing(false)
      }
    },
    [onImageSelected]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled || previewUrl) return

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [disabled, previewUrl, handleFile]
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
    if (!disabled && !previewUrl && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled, previewUrl])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
      e.target.value = ''
    },
    [handleFile]
  )

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onImageRemoved()
      setError(null)
    },
    [onImageRemoved]
  )

  const canUpload = !disabled && !previewUrl && !isProcessing

  // Show preview if image is selected
  if (previewUrl) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
          <img
            src={previewUrl}
            alt="업로드된 이미지"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              aria-label="이미지 삭제"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-center text-gray-500">
          오늘의 사진이 대화에 반영됩니다
        </p>
      </div>
    )
  }

  // Show upload area
  return (
    <div className={`w-full ${className}`}>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative w-full aspect-video border-2 border-dashed rounded-xl
          flex flex-col items-center justify-center gap-3
          transition-all
          ${isDragging ? 'border-pastel-purple bg-pastel-purple/10' : 'border-gray-300'}
          ${canUpload ? 'cursor-pointer hover:border-pastel-purple hover:bg-pastel-pink-light/30' : 'opacity-50 cursor-not-allowed'}
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
            <div className="w-10 h-10 border-2 border-pastel-purple border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">이미지 처리 중...</span>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-pastel-purple/10 flex items-center justify-center">
              <PhotoIcon className="w-6 h-6 text-pastel-purple" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 font-medium">
                오늘의 사진 올리기
              </p>
              <p className="text-xs text-gray-400 mt-1">
                선택사항 - 클릭하거나 드래그하세요
              </p>
            </div>
            <span className="text-xs text-gray-400">
              JPG, PNG, WebP (최대 10MB)
            </span>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  )
}
