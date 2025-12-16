'use client'

import { SubscriptionManager } from '@/components/payment/SubscriptionManager'
import type { UserSubscription } from '@/types/payment'

interface SubscriptionSectionProps {
  subscription: UserSubscription | null
}

export function SubscriptionSection({ subscription }: SubscriptionSectionProps) {
  return (
    <section className="mb-8 rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-sm border border-pastel-purple/30">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">✨</span>
        <h2 className="text-lg font-semibold text-gray-700">프리미엄 구독</h2>
      </div>
      <SubscriptionManager currentSubscription={subscription} />
    </section>
  )
}
