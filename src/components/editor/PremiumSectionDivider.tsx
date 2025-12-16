'use client'

interface PremiumSectionDividerProps {
  isPremium?: boolean
  itemCount?: number
}

export function PremiumSectionDivider({
  isPremium = false,
  itemCount,
}: PremiumSectionDividerProps) {
  // Hide if no premium items
  if (itemCount !== undefined && itemCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px bg-amber-200" />
      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
        <span className="text-xs">{isPremium ? '✨' : '🔒'}</span>
        <span className="text-xs text-amber-600 font-medium">프리미엄 전용</span>
      </div>
      <div className="flex-1 h-px bg-amber-200" />
    </div>
  )
}
