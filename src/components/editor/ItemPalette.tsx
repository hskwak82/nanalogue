'use client'

import { useState } from 'react'
import { DecorationItem, DECORATION_CATEGORIES } from '@/types/customization'

interface ItemPaletteProps {
  items: DecorationItem[]
  onSelectItem: (item: { item_id: string; type: 'emoji' | 'icon' | 'sticker'; content: string }) => void
}

export function ItemPalette({ items, onSelectItem }: ItemPaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('nature')

  // Filter items by category
  const filteredItems = items.filter((item) => item.category === selectedCategory)

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

      {/* Items grid */}
      <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() =>
              onSelectItem({
                item_id: item.id,
                type: item.item_type as 'emoji' | 'icon' | 'sticker',
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
    </div>
  )
}
