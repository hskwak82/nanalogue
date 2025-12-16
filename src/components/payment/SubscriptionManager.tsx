'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { PlanCard } from './PlanCard'
import { TossPayment } from './TossPayment'
import type { SubscriptionPlan, UserSubscription } from '@/types/payment'

type PaymentMode = 'billing' | 'onetime'

interface SubscriptionManagerProps {
  currentSubscription: UserSubscription | null
}

export function SubscriptionManager({ currentSubscription }: SubscriptionManagerProps) {
  const searchParams = useSearchParams()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPaymentOptions, setShowPaymentOptions] = useState(false)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('onetime')
  const [customerKey, setCustomerKey] = useState<string>('')

  // Check URL params for payment status
  useEffect(() => {
    if (searchParams.get('payment_success') === 'true') {
      const type = searchParams.get('type')
      if (type === 'payment') {
        setSuccessMessage('결제가 완료되었습니다. 프로 플랜이 활성화되었습니다!')
      } else {
        setSuccessMessage('카드가 성공적으로 등록되었습니다.')
      }
      window.history.replaceState({}, '', '/settings')
    }
    if (searchParams.get('payment_error') === 'true') {
      const message = searchParams.get('message')
      setError(message ? `결제 실패: ${message}` : '결제에 실패했습니다.')
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams])

  // Load plans from database
  useEffect(() => {
    async function loadPlans() {
      try {
        const response = await fetch('/api/payments/plans')
        const data = await response.json()
        if (data.plans) {
          setPlans(data.plans)
        }
      } catch (err) {
        console.error('Failed to load plans:', err)
        setError('플랜 정보를 불러오는데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    loadPlans()
  }, [])

  const currentPlan = currentSubscription?.plan || 'free'
  const hasBillingKey = !!currentSubscription?.toss_billing_key
  const proPlan = plans.find(p => p.id === 'pro')

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlan) return

    // If selecting pro plan, show payment options
    if (planId === 'pro') {
      const newCustomerKey = `customer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      setCustomerKey(newCustomerKey)

      // If already has billing key, use auto payment
      if (hasBillingKey) {
        // Subscribe using existing billing key
        setIsProcessing(true)
        try {
          const response = await fetch('/api/payments/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId }),
          })
          const data = await response.json()
          if (!response.ok) {
            throw new Error(data.error || 'Failed to subscribe')
          }
          window.location.reload()
        } catch (err) {
          setError(err instanceof Error ? err.message : '구독 실패')
        } finally {
          setIsProcessing(false)
        }
        return
      }

      // Show payment options modal
      setShowPaymentOptions(true)
      return
    }

    // Downgrade to free
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subscription')
      }

      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '구독 변경에 실패했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentOptionSelect = (mode: PaymentMode) => {
    setPaymentMode(mode)
    setShowPaymentOptions(false)
    setShowPaymentModal(true)
  }

  const handleCancelSubscription = async () => {
    if (!confirm('정말 구독을 취소하시겠습니까? 현재 결제 기간이 끝날 때까지는 프리미엄 기능을 계속 사용할 수 있습니다.')) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/cancel', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      alert(data.message)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '구독 취소에 실패했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveCard = async () => {
    if (!confirm('등록된 카드를 삭제하시겠습니까?')) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/card', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove card')
      }

      setSuccessMessage(data.message)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '카드 삭제에 실패했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        플랜 정보를 불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-white/50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">현재 플랜</p>
            <p className="text-lg font-semibold text-gray-800">
              {currentPlan === 'pro' ? '프로' : '무료'}
              {currentSubscription?.status === 'canceled' && (
                <span className="ml-2 text-sm text-amber-600">(취소됨)</span>
              )}
            </p>
          </div>
          {currentSubscription?.card_number && (
            <div className="text-right">
              <p className="text-sm text-gray-500">결제 수단</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-700">
                  {currentSubscription.card_company} ****{currentSubscription.card_number}
                </p>
                <button
                  onClick={handleRemoveCard}
                  disabled={isProcessing || (currentPlan === 'pro' && currentSubscription.status === 'active')}
                  className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  title={currentPlan === 'pro' && currentSubscription.status === 'active'
                    ? '구독 취소 후 삭제 가능'
                    : '카드 삭제'}
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
        {currentSubscription?.next_billing_date && currentSubscription.status === 'active' && (
          <p className="mt-2 text-xs text-gray-500">
            다음 결제일: {new Date(currentSubscription.next_billing_date).toLocaleDateString('ko-KR')}
          </p>
        )}
        {currentSubscription?.current_period_end && (
          <p className="mt-2 text-xs text-gray-500">
            이용 기간: {new Date(currentSubscription.current_period_end).toLocaleDateString('ko-KR')}까지
          </p>
        )}
      </div>

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={currentPlan === plan.id}
            onSelect={() => handleSelectPlan(plan.id)}
            disabled={isProcessing}
          />
        ))}
      </div>

      {/* Cancel Subscription */}
      {currentPlan === 'pro' && currentSubscription?.status === 'active' && (
        <div className="text-center">
          <button
            onClick={handleCancelSubscription}
            disabled={isProcessing}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            구독 취소
          </button>
        </div>
      )}

      {/* Payment Options Modal */}
      {showPaymentOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">결제 방식 선택</h3>

            <div className="space-y-3">
              {/* One-time Payment */}
              <button
                onClick={() => handlePaymentOptionSelect('onetime')}
                className="w-full p-4 border-2 border-pastel-purple rounded-xl text-left hover:bg-pastel-purple/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">1개월 결제</p>
                    <p className="text-sm text-gray-500">지금 바로 1개월 이용권 결제</p>
                  </div>
                  <span className="text-lg font-bold text-pastel-purple">
                    ₩{proPlan?.price.toLocaleString()}
                  </span>
                </div>
              </button>

              {/* Auto Payment (Billing) */}
              <button
                onClick={() => handlePaymentOptionSelect('billing')}
                className="w-full p-4 border border-gray-200 rounded-xl text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">자동결제 등록</p>
                    <p className="text-sm text-gray-500">카드 등록 후 매월 자동 결제</p>
                    <p className="text-xs text-amber-600 mt-1">* 별도 계약 필요</p>
                  </div>
                  <span className="text-sm text-gray-400">→</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowPaymentOptions(false)}
              className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Toss Payment Modal */}
      {showPaymentModal && customerKey && (
        <TossPayment
          customerKey={customerKey}
          mode={paymentMode}
          amount={proPlan?.price || 4900}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  )
}
