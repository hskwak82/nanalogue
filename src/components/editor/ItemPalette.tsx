'use client'

import { useState } from 'react'
import { DecorationItem, DECORATION_CATEGORIES, ItemType, PhotoMeta } from '@/types/customization'
import { PhotoUploader } from './photo/PhotoUploader'
import { PhotoCropModal } from './photo/PhotoCropModal'
import { PremiumSectionDivider } from './PremiumSectionDivider'

interface ItemPaletteProps {
  items: DecorationItem[]
  onSelectItem: (item: { item_id: string; type: ItemType; content: string; photo_meta?: PhotoMeta }) => void
  diaryId?: string
  photoCount?: number
  isPremium?: boolean
}

export function ItemPalette({
  items,
  onSelectItem,
  diaryId,
  photoCount = 0,
  isPremium = false,
}: ItemPaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('photo')
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; thumbnailUrl: string } | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)

  // Filter items by category (skip for photo category)
  const filteredItems = selectedCategory === 'photo'
    ? []
    : items.filter((item) => item.category === selectedCategory)

  // Separate free and premium items
  const freeItems = filteredItems.filter(item => item.is_free)
  const premiumItems = filteredItems.filter(item => !item.is_free)

  const handlePhotoSelected = (file: File, thumbnailUrl: string) => {
    setPendingPhoto({ file, thumbnailUrl })
    setShowCropModal(true)
  }

  const handleCropComplete = async (croppedBlob: Blob, cropMeta: Omit<PhotoMeta, 'photo_id'>) => {
    if (!pendingPhoto) return

    try {
      // Upload to Supabase Storage via API
      const formData = new FormData()
      formData.append('file', pendingPhoto.file)
      formData.append('cropped_file', croppedBlob, 'cropped.png')
      formData.append('crop_type', cropMeta.crop_type)
      if (cropMeta.shape_type) {
        formData.append('shape_type', cropMeta.shape_type)
      }
      if (cropMeta.lasso_path) {
        formData.append('lasso_path', cropMeta.lasso_path)
      }
      if (diaryId) {
        formData.append('diary_id', diaryId)
      }

      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '업로드 실패')
      }

      const data = await response.json()

      // Add photo decoration with permanent URL
      onSelectItem({
        item_id: data.photo_id,
        type: 'photo',
        content: data.cropped_url || data.original_url,
        photo_meta: {
          ...cropMeta,
          photo_id: data.photo_id,
          original_url: data.original_url,
          cropped_url: data.cropped_url,
        },
      })
    } catch (error) {
      console.error('Photo upload error:', error)
      alert('사진 업로드에 실패했습니다. 다시 시도해주세요.')
    }

    // Clean up
    setPendingPhoto(null)
    setShowCropModal(false)
  }

  const renderItem = (item: DecorationItem, isLocked: boolean = false) => (
    <button
      key={item.id}
      onClick={() =>
        !isLocked && onSelectItem({
          item_id: item.id,
          type: item.item_type,
          content: item.content,
        })
      }
      disabled={isLocked}
      className={`
        relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors
        ${isLocked
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:bg-pastel-pink-light cursor-pointer'
        }
      `}
      title={isLocked ? '프리미엄 구독 필요' : item.name}
    >
      {item.item_type === 'emoji' ? (
        <span className="text-2xl">{item.content}</span>
      ) : (
        <span
          className="w-6 h-6 text-pastel-purple-dark"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      )}

      {/* Lock indicator for premium items */}
      {isLocked && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
          <span className="text-[8px]">🔒</span>
        </div>
      )}

      {/* Premium indicator (unlocked) */}
      {!item.is_free && isPremium && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
          <span className="text-[8px]">✨</span>
        </div>
      )}
    </button>
  )

  return (
    <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-pastel-pink/30">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">꾸미기 아이템</h3>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {DECORATION_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-2 py-1 rounded-full text-xs transition-all ${
              selectedCategory === category.id
                ? 'bg-pastel-purple text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>

      {/* Photo upload section */}
      {selectedCategory === 'photo' ? (
        <PhotoUploader
          diaryId={diaryId}
          onPhotoSelected={handlePhotoSelected}
          maxPhotos={isPremium ? 100 : 5}
          currentPhotoCount={photoCount}
        />
      ) : (
        /* Items grid with free/premium separation */
        <div className="max-h-48 overflow-y-auto">
          {/* Free items */}
          {freeItems.length > 0 && (
            <div className="grid grid-cols-6 gap-2">
              {freeItems.map(item => renderItem(item, false))}
            </div>
          )}

          {/* Premium items */}
          {premiumItems.length > 0 && (
            <>
              <PremiumSectionDivider isPremium={isPremium} itemCount={premiumItems.length} />
              <div className="grid grid-cols-6 gap-2">
                {premiumItems.map(item => renderItem(item, !isPremium))}
              </div>
            </>
          )}

          {/* Empty state */}
          {freeItems.length === 0 && premiumItems.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">
              아이템이 없습니다
            </p>
          )}
        </div>
      )}

      {/* Photo Crop Modal */}
      {pendingPhoto && (
        <PhotoCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false)
            setPendingPhoto(null)
          }}
          imageUrl={URL.createObjectURL(pendingPhoto.file)}
          thumbnailUrl={pendingPhoto.thumbnailUrl}
          isPremium={isPremium}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
