'use client'

import type { SubscriptionPlan } from '@/types/payment'

interface PlanCardProps {
  plan: SubscriptionPlan
  isCurrentPlan: boolean
  onSelect: () => void
  disabled?: boolean
}

export function PlanCard({ plan, isCurrentPlan, onSelect, disabled }: PlanCardProps) {
  const isPro = plan.id === 'pro'

  return (
    <div
      className={`relative rounded-2xl p-6 transition-all ${
        isPro
          ? 'bg-gradient-to-br from-pastel-purple/20 to-pastel-pink/20 border-2 border-pastel-purple'
          : 'bg-white/70 border border-gray-200'
      } ${isCurrentPlan ? 'ring-2 ring-pastel-mint ring-offset-2' : ''}`}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pastel-purple text-white text-xs font-medium px-3 py-1 rounded-full">
          추천
        </div>
      )}

      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
        <div className="mt-2">
          {plan.price === 0 ? (
            <span className="text-2xl font-bold text-gray-600">무료</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-pastel-purple">
                ₩{plan.price.toLocaleString()}
              </span>
              <span className="text-gray-500 text-sm">/월</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
            <span className={isPro ? 'text-pastel-purple' : 'text-pastel-mint'}>✓</span>
            {feature}
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <div className="w-full py-2 text-center text-sm font-medium text-pastel-mint bg-pastel-mint/10 rounded-full">
          현재 플랜
        </div>
      ) : (
        <button
          onClick={onSelect}
          disabled={disabled}
          className={`w-full py-2 rounded-full font-medium transition-all ${
            isPro
              ? 'bg-pastel-purple text-white hover:bg-pastel-purple-dark'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isPro ? '업그레이드' : '다운그레이드'}
        </button>
      )}
    </div>
  )
}
