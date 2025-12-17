'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui'
import { DecorationItem, DECORATION_CATEGORIES, ItemType, PhotoMeta } from '@/types/customization'
import { PhotoUploader } from './photo/PhotoUploader'
import { PhotoCropModal } from './photo/PhotoCropModal'
import { PremiumTabs } from './PremiumSectionDivider'

type PlanTab = 'free' | 'premium'

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
  const { toast } = useToast()
  // Default to first non-photo category
  const [selectedCategory, setSelectedCategory] = useState<string>('nature')
  const [planTab, setPlanTab] = useState<PlanTab>('free')
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; thumbnailUrl: string } | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)

  // Filter items by category (skip for photo category)
  const filteredItems = selectedCategory === 'photo'
    ? []
    : items.filter((item) => item.category === selectedCategory)

  // Separate free and premium items
  const freeItems = filteredItems.filter(item => item.is_free)
  const premiumItems = filteredItems.filter(item => !item.is_free)

  const displayItems = planTab === 'free' ? freeItems : premiumItems
  const isLocked = planTab === 'premium' && !isPremium

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
      toast.error('사진 업로드에 실패했습니다. 다시 시도해주세요.')
    }

    // Clean up
    setPendingPhoto(null)
    setShowCropModal(false)
  }

  const renderItem = (item: DecorationItem) => (
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
          ? 'cursor-not-allowed'
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

    </button>
  )

  // Get photo category for the header button
  const photoCategory = DECORATION_CATEGORIES.find(c => c.id === 'photo')
  // Filter out photo from main category tabs
  const mainCategories = DECORATION_CATEGORIES.filter(c => c.id !== 'photo')

  return (
    <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-pastel-pink/30">
      {/* Header with photo button next to title */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-700">꾸미기 아이템</h3>
        {photoCategory && (
          <button
            onClick={() => {
              setSelectedCategory('photo')
              setPlanTab('free')
            }}
            className={`px-2 py-0.5 rounded-full text-xs transition-all ${
              selectedCategory === 'photo'
                ? 'bg-pastel-purple text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {photoCategory.icon} {photoCategory.name}
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {mainCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.id)
              setPlanTab('free') // Reset to free tab when changing category
            }}
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
        /* Items grid with tabs */
        <div>
          {/* Plan tabs - only show if there are premium items */}
          {premiumItems.length > 0 && (
            <PremiumTabs
              activeTab={planTab}
              onTabChange={setPlanTab}
              freeCount={freeItems.length}
              premiumCount={premiumItems.length}
              isPremium={isPremium}
            />
          )}

          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {displayItems.map(renderItem)}
            {displayItems.length === 0 && (
              <p className="col-span-6 text-center text-gray-400 text-sm py-4">
                아이템이 없습니다
              </p>
            )}
          </div>
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
