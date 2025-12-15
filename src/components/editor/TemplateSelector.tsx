'use client'

import { CoverTemplate, PaperTemplate } from '@/types/customization'
import { PaperPreview } from '../diary/DiaryPaper'

interface CoverTemplateSelectorProps {
  templates: CoverTemplate[]
  selectedId: string | null
  onSelect: (template: CoverTemplate) => void
}

// Parse cover image_url
function parseImageUrl(imageUrl: string) {
  if (imageUrl.startsWith('gradient:')) {
    return { type: 'gradient' as const, value: imageUrl.replace('gradient:', '') }
  }
  if (imageUrl.startsWith('solid:')) {
    return { type: 'solid' as const, value: imageUrl.replace('solid:', '') }
  }
  return { type: 'image' as const, value: imageUrl }
}

export function CoverTemplateSelector({
  templates,
  selectedId,
  onSelect,
}: CoverTemplateSelectorProps) {
  return (
    <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-pastel-pink/30">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">표지 선택</h3>

      <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto">
        {templates.map((template) => {
          const parsed = parseImageUrl(template.image_url)
          const style =
            parsed.type === 'gradient'
              ? { background: parsed.value }
              : parsed.type === 'solid'
              ? { backgroundColor: parsed.value }
              : { backgroundImage: `url(${parsed.value})`, backgroundSize: 'cover' }

          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                selectedId === template.id
                  ? 'border-pastel-purple ring-2 ring-pastel-purple/30'
                  : 'border-gray-200 hover:border-pastel-purple/50'
              }`}
              style={style}
              title={template.name}
            >
              {/* Book spine effect */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 opacity-20"
                style={{
                  background: 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)',
                }}
              />

              {/* Selected indicator */}
              {selectedId === template.id && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-pastel-purple rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              {/* Free badge */}
              {template.is_free && (
                <div className="absolute top-1 left-1 px-1 py-0.5 bg-pastel-mint text-[10px] text-pastel-purple-dark rounded">
                  무료
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface PaperTemplateSelectorProps {
  templates: PaperTemplate[]
  selectedId: string | null
  onSelect: (template: PaperTemplate) => void
}

export function PaperTemplateSelector({
  templates,
  selectedId,
  onSelect,
}: PaperTemplateSelectorProps) {
  return (
    <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-pastel-pink/30">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">속지 선택</h3>

      <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto">
        {templates.map((template) => (
          <div key={template.id} className="flex flex-col items-center gap-1">
            <PaperPreview
              template={template}
              isSelected={selectedId === template.id}
              onClick={() => onSelect(template)}
            />
            <span className="text-xs text-gray-500">{template.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
