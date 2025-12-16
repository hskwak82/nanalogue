'use client'

type PlanTab = 'free' | 'premium'

interface PremiumTabsProps {
  activeTab: PlanTab
  onTabChange: (tab: PlanTab) => void
  freeCount: number
  premiumCount: number
  isPremium?: boolean
}

export function PremiumTabs({
  activeTab,
  onTabChange,
  freeCount,
  premiumCount,
  isPremium = false,
}: PremiumTabsProps) {
  return (
    <div className="flex gap-1 mb-3">
      <button
        onClick={() => onTabChange('free')}
        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
          activeTab === 'free'
            ? 'bg-pastel-mint text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        무료 ({freeCount})
      </button>
      <button
        onClick={() => onTabChange('premium')}
        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
          activeTab === 'premium'
            ? 'bg-amber-400 text-white'
            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
        }`}
      >
        {isPremium ? '✨' : '🔒'} 프리미엄 ({premiumCount})
      </button>
    </div>
  )
}
