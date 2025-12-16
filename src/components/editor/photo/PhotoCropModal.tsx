'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShapeType, CropType, PhotoMeta } from '@/types/customization'
import { ShapeMaskSelector, ShapePreview } from './ShapeMaskSelector'
import { LassoCropCanvas } from './LassoCropCanvas'
import { applyShapeMask, applyLassoMask, canvasToBlob, loadImage } from '@/lib/image/compress'
import { SHAPE_PATHS } from '@/lib/image/compress'

type CropTab = 'shape' | 'lasso'

interface PhotoCropModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  thumbnailUrl: string
  isPremium?: boolean
  onCropComplete: (croppedBlob: Blob, cropMeta: Omit<PhotoMeta, 'photo_id'>) => void
}

export function PhotoCropModal({
  isOpen,
  onClose,
  imageUrl,
  thumbnailUrl,
  isPremium = false,
  onCropComplete,
}: PhotoCropModalProps) {
  const [activeTab, setActiveTab] = useState<CropTab>('shape')
  const [selectedShape, setSelectedShape] = useState<ShapeType>('circle')
  const [lassoPath, setLassoPath] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPremiumNotice, setShowPremiumNotice] = useState(false)

  // Premium users can use lasso crop
  const canUseLasso = isPremium

  const handleTabChange = (tab: CropTab) => {
    if (tab === 'lasso' && !isPremium) {
      // Show premium notice for non-premium users
      setShowPremiumNotice(true)
      setTimeout(() => setShowPremiumNotice(false), 3000)
      return // Don't switch tab for non-premium users
    }
    setActiveTab(tab)
    setError(null)
  }

  const handleLassoComplete = useCallback((path: string) => {
    setLassoPath(path)
    setError(null)
  }, [])

  const handleLassoClear = useCallback(() => {
    setLassoPath(null)
  }, [])

  const handleApply = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      let croppedBlob: Blob
      let cropMeta: Omit<PhotoMeta, 'photo_id'>

      if (activeTab === 'shape') {
        // Apply shape mask
        const shapePath = SHAPE_PATHS[selectedShape]
        croppedBlob = await applyShapeMask(imageUrl, shapePath, 400)
        cropMeta = {
          original_url: imageUrl,
          crop_type: 'shape',
          shape_type: selectedShape,
        }
      } else {
        // Apply lasso mask
        if (!lassoPath) {
          setError('영역을 먼저 그려주세요.')
          setIsProcessing(false)
          return
        }

        croppedBlob = await applyLassoMask(imageUrl, lassoPath, 300, 300)
        cropMeta = {
          original_url: imageUrl,
          crop_type: 'lasso',
          lasso_path: lassoPath,
        }
      }

      onCropComplete(croppedBlob, cropMeta)
      onClose()
    } catch (err) {
      console.error('Crop error:', err)
      setError('이미지 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSkipCrop = async () => {
    setIsProcessing(true)
    try {
      // Load original image and convert to blob
      const img = await loadImage(imageUrl)
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context error')

      // Center crop
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2

      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400)
      const blob = await canvasToBlob(canvas, 'png')

      onCropComplete(blob, {
        original_url: imageUrl,
        crop_type: 'none',
      })
      onClose()
    } catch (err) {
      console.error('Skip crop error:', err)
      setError('이미지 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">사진 오리기</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          {/* Tab selector */}
          <div className="flex border-b">
            <button
              onClick={() => handleTabChange('shape')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'shape'
                  ? 'text-pastel-purple border-b-2 border-pastel-purple'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🔷 도형 마스크
            </button>
            <button
              onClick={() => handleTabChange('lasso')}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'lasso'
                  ? 'text-pastel-purple border-b-2 border-pastel-purple'
                  : 'text-gray-500 hover:text-gray-700'
              } ${!canUseLasso ? 'opacity-60' : ''}`}
            >
              ✂️ 자유형 오리기
              {!canUseLasso && (
                <span className="ml-1 text-xs text-amber-500">🔒</span>
              )}
            </button>
          </div>

          {/* Premium Notice Toast */}
          <AnimatePresence>
            {showPremiumNotice && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-20 left-4 right-4 z-10 p-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <p className="font-medium text-sm">프리미엄 기능입니다</p>
                    <p className="text-xs opacity-90">테스트 기간 동안 무료로 사용해보세요!</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {activeTab === 'shape' ? (
              <div className="space-y-4">
                {/* Shape selector */}
                <div>
                  <p className="text-sm text-gray-600 mb-3">모양을 선택하세요</p>
                  <ShapeMaskSelector
                    selectedShape={selectedShape}
                    onSelectShape={setSelectedShape}
                    isPremium={isPremium}
                  />
                </div>

                {/* Preview */}
                <div className="flex justify-center py-4">
                  <div className="bg-gray-100 p-4 rounded-xl">
                    <ShapePreview
                      imageUrl={thumbnailUrl}
                      shape={selectedShape}
                      size={180}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  손가락으로 원하는 영역을 그려주세요. 시작점으로 돌아오면 완성됩니다.
                </p>

                <div className="flex justify-center">
                  <LassoCropCanvas
                    imageUrl={thumbnailUrl}
                    onPathComplete={handleLassoComplete}
                    onPathClear={handleLassoClear}
                    width={280}
                    height={280}
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 p-4 border-t bg-gray-50">
            <button
              onClick={handleSkipCrop}
              disabled={isProcessing}
              className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50"
            >
              오리지 않고 사용
            </button>
            <button
              onClick={handleApply}
              disabled={isProcessing || (activeTab === 'lasso' && !lassoPath)}
              className="flex-1 py-3 text-sm font-medium text-white bg-pastel-purple rounded-xl hover:bg-pastel-purple-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  처리 중...
                </span>
              ) : (
                '적용하기'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
