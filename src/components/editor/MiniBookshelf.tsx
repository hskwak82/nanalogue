'use client'

import { motion } from 'framer-motion'
import type { DiaryWithTemplates } from '@/types/diary'

interface MiniBookshelfProps {
  diaries: DiaryWithTemplates[]
  selectedDiaryId: string | null
  onSelectDiary: (diary: DiaryWithTemplates) => void
}

// Parse cover image_url which can be gradient, solid, or actual URL
function parseImageUrl(imageUrl: string): {
  type: 'gradient' | 'solid' | 'image'
  value: string
} {
  if (imageUrl.startsWith('gradient:')) {
    return { type: 'gradient', value: imageUrl.replace('gradient:', '') }
  }
  if (imageUrl.startsWith('solid:')) {
    return { type: 'solid', value: imageUrl.replace('solid:', '') }
  }
  return { type: 'image', value: imageUrl }
}

// Mini spine for the customize page bookshelf
function MiniSpine({
  diary,
  isSelected,
  onClick,
}: {
  diary: DiaryWithTemplates
  isSelected: boolean
  onClick: () => void
}) {
  const title = diary.title || `${diary.volume_number}권`

  // Get spine style - prioritize user-selected spine image
  const getSpineStyle = () => {
    // 1. First priority: user-selected spine region image
    if (diary.spine_image_url) {
      return {
        backgroundImage: `url(${diary.spine_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }

    // 2. Second priority: show left portion of cover image
    if (diary.cover_image_url) {
      return {
        backgroundImage: `url(${diary.cover_image_url})`,
        backgroundSize: 'auto 100%',
        backgroundPosition: 'left center',
      }
    }

    // 3. Third priority: use cover template
    if (diary.cover_template?.image_url) {
      const parsed = parseImageUrl(diary.cover_template.image_url)
      switch (parsed.type) {
        case 'gradient':
          return { background: parsed.value }
        case 'solid':
          return { backgroundColor: parsed.value }
        case 'image':
          return {
            backgroundImage: `url(${parsed.value})`,
            backgroundSize: 'auto 100%',
            backgroundPosition: 'left center',
          }
      }
    }

    // 4. Fallback: use spine_gradient or spine_color
    if (diary.spine_gradient) {
      return { background: diary.spine_gradient }
    }
    if (diary.spine_color) {
      return { backgroundColor: diary.spine_color }
    }

    // 5. Default: pastel lavender
    return { background: 'linear-gradient(135deg, #E8E0F0 0%, #D4C5E2 50%, #C9B8DA 100%)' }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-sm shadow-md flex-shrink-0 overflow-hidden transition-all ${
        isSelected ? 'ring-2 ring-pastel-purple ring-offset-2' : ''
      }`}
      style={{
        width: 24,
        height: 100,
        ...getSpineStyle(),
      }}
    >
      {/* Volume number */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
        }}
      >
        <span
          className="text-[9px] font-medium drop-shadow-sm truncate px-0.5"
          style={{
            color: 'white',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            maxHeight: '90%',
          }}
        >
          {title}
        </span>
      </div>
    </motion.div>
  )
}

export function MiniBookshelf({
  diaries,
  selectedDiaryId,
  onSelectDiary,
}: MiniBookshelfProps) {
  if (diaries.length === 0) {
    return null
  }

  // Sort by volume number
  const sortedDiaries = [...diaries].sort((a, b) => a.volume_number - b.volume_number)

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">내 책장</span>
        <span className="text-[10px] text-gray-400">({diaries.length}권)</span>
      </div>

      {/* Bookshelf - horizontal scroll */}
      <div className="relative">
        {/* Shelf background */}
        <div
          className="absolute bottom-0 left-0 right-0 h-2 rounded-sm"
          style={{
            background: 'linear-gradient(to bottom, #8B7355 0%, #6B5344 100%)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />

        {/* Spines container */}
        <div className="flex gap-1 pb-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {sortedDiaries.map((diary) => (
            <MiniSpine
              key={diary.id}
              diary={diary}
              isSelected={diary.id === selectedDiaryId}
              onClick={() => onSelectDiary(diary)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
