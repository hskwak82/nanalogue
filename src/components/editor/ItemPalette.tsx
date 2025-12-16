'use client'

import { useState } from 'react'
import { DecorationItem, DECORATION_CATEGORIES, ItemType, PhotoMeta } from '@/types/customization'
import { PhotoUploader } from './photo/PhotoUploader'
import { PhotoCropModal } from './photo/PhotoCropModal'

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

  const handlePhotoSelected = (file: File, thumbnailUrl: string) => {
    setPendingPhoto({ file, thumbnailUrl })
    setShowCropModal(true)
  }

  const handleCropComplete = async (croppedBlob: Blob, cropMeta: Omit<PhotoMeta, 'photo_id'>) => {
    if (!pendingPhoto) return

    // Create temporary URL for the cropped image
    const croppedUrl = URL.createObjectURL(croppedBlob)

    // Generate a temporary ID (will be replaced when uploaded to server)
    const tempId = `temp_${Date.now()}`

    // Add photo decoration
    onSelectItem({
      item_id: tempId,
      type: 'photo',
      content: croppedUrl,
      photo_meta: {
        ...cropMeta,
        photo_id: tempId,
      },
    })

    // Clean up
    setPendingPhoto(null)
    setShowCropModal(false)
  }

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
        /* Items grid */
        <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                onSelectItem({
                  item_id: item.id,
                  type: item.item_type,
                  content: item.content,
                })
              }
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-pastel-pink-light transition-colors"
              title={item.name}
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
          ))}

          {filteredItems.length === 0 && (
            <p className="col-span-6 text-center text-gray-400 text-sm py-4">
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
