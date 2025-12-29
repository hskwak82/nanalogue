'use client'

import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { SubscriptionManager } from '@/components/payment/SubscriptionManager'
import type { UserSubscription } from '@/types/payment'

interface SubscriptionSectionProps {
  subscription: UserSubscription | null
}

export function SubscriptionSection({ subscription }: SubscriptionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const currentPlan = subscription?.plan || 'free'
  const planLabel = currentPlan === 'pro' ? '프로' : '무료'

  return (
    <section className="mb-8 rounded-2xl bg-white/70 backdrop-blur-sm shadow-sm border border-pastel-purple/30 overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h2 className="text-lg font-semibold text-gray-700">프리미엄 구독</h2>
          <span className="ml-2 text-sm text-pastel-purple bg-pastel-purple-light px-2 py-0.5 rounded-full">
            {planLabel}
          </span>
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Accordion Content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-6 pb-6">
          <SubscriptionManager currentSubscription={subscription} />
        </div>
      </div>
    </section>
  )
}
