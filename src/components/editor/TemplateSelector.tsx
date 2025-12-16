'use client'

import { CoverTemplate, PaperTemplate } from '@/types/customization'
import { PaperPreview } from '../diary/DiaryPaper'
import { PremiumSectionDivider } from './PremiumSectionDivider'

interface CoverTemplateSelectorProps {
  templates: CoverTemplate[]
  selectedId: string | null
  onSelect: (template: CoverTemplate) => void
  isPremium?: boolean
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
  isPremium = false,
}: CoverTemplateSelectorProps) {
  const freeTemplates = templates.filter(t => t.is_free)
  const premiumTemplates = templates.filter(t => !t.is_free)

  const renderTemplate = (template: CoverTemplate, isLocked: boolean) => {
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
        onClick={() => !isLocked && onSelect(template)}
        disabled={isLocked}
        className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
          isLocked
            ? 'opacity-60 cursor-not-allowed border-gray-200'
            : selectedId === template.id
              ? 'border-pastel-purple ring-2 ring-pastel-purple/30'
              : 'border-gray-200 hover:border-pastel-purple/50'
        }`}
        style={style}
        title={isLocked ? '프리미엄 구독 필요' : template.name}
      >
        {/* Book spine effect */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 opacity-20"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)',
          }}
        />

        {/* Selected indicator */}
        {selectedId === template.id && !isLocked && (
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

        {/* Lock indicator for premium templates */}
        {isLocked && (
          <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
            <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
              <span className="text-xs">🔒</span>
            </div>
          </div>
        )}

        {/* Premium indicator (unlocked) */}
        {!template.is_free && isPremium && (
          <div className="absolute top-1 left-1 px-1 py-0.5 bg-amber-400 text-[10px] text-white rounded flex items-center gap-0.5">
            <span>✨</span>
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-pastel-pink/30">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">표지 선택</h3>

      <div className="max-h-48 overflow-y-auto">
        {/* Free templates */}
        {freeTemplates.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {freeTemplates.map(template => renderTemplate(template, false))}
          </div>
        )}

        {/* Premium templates */}
        {premiumTemplates.length > 0 && (
          <>
            <PremiumSectionDivider isPremium={isPremium} itemCount={premiumTemplates.length} />
            <div className="grid grid-cols-4 gap-3">
              {premiumTemplates.map(template => renderTemplate(template, !isPremium))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface PaperTemplateSelectorProps {
  templates: PaperTemplate[]
  selectedId: string | null
  onSelect: (template: PaperTemplate) => void
  isPremium?: boolean
}

export function PaperTemplateSelector({
  templates,
  selectedId,
  onSelect,
  isPremium = false,
}: PaperTemplateSelectorProps) {
  const freeTemplates = templates.filter(t => t.is_free)
  const premiumTemplates = templates.filter(t => !t.is_free)

  const renderTemplate = (template: PaperTemplate, isLocked: boolean) => (
    <div key={template.id} className="flex flex-col items-center gap-1">
      <div className="relative">
        <PaperPreview
          template={template}
          isSelected={!isLocked && selectedId === template.id}
          onClick={() => !isLocked && onSelect(template)}
        />

        {/* Lock overlay for premium templates */}
        {isLocked && (
          <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center rounded-lg">
            <div className="w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center">
              <span className="text-[10px]">🔒</span>
            </div>
          </div>
        )}

        {/* Premium indicator (unlocked) */}
        {!template.is_free && isPremium && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
            <span className="text-[8px]">✨</span>
          </div>
        )}
      </div>
      <span className={`text-xs ${isLocked ? 'text-gray-400' : 'text-gray-500'}`}>
        {template.name}
      </span>
    </div>
  )

  return (
    <div className="bg-white/80 rounded-xl p-4 shadow-sm border border-pastel-pink/30">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">속지 선택</h3>

      <div className="max-h-48 overflow-y-auto">
        {/* Free templates */}
        {freeTemplates.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {freeTemplates.map(template => renderTemplate(template, false))}
          </div>
        )}

        {/* Premium templates */}
        {premiumTemplates.length > 0 && (
          <>
            <PremiumSectionDivider isPremium={isPremium} itemCount={premiumTemplates.length} />
            <div className="flex flex-wrap gap-3">
              {premiumTemplates.map(template => renderTemplate(template, !isPremium))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
